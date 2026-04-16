import { signIn as amplifySignIn } from "aws-amplify/auth";
import { isCognitoConfigured } from "./amplifyConfig.js";
import { mapCognitoSignInError } from "./cognitoAuthErrors.js";

/**
 * @param {{ username: string; password: string }} credentials
 * `username` is the Cognito username or verified email alias.
 */
export async function signInWithCognito(credentials) {
  if (!isCognitoConfigured()) {
    throw new Error(
      "Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID in .env.local.",
    );
  }

  const username = credentials.username.trim();
  const { password } = credentials;

  try {
    const output = await amplifySignIn({ username, password });

    if (output.isSignedIn) {
      console.log("[AppliCache] Login successful");
      return { isSignedIn: true };
    }

    const step = output.nextStep?.signInStep;
    if (step && step !== "DONE") {
      console.warn(
        "[AppliCache] Sign-in requires an additional step:",
        step,
        output.nextStep,
      );
      throw new Error(
        "Additional sign-in step is required (e.g. MFA or new password). This flow is not implemented yet.",
      );
    }

    throw new Error("Sign-in did not complete.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Additional sign-in step")) {
      throw err;
    }
    const { message, field } = mapCognitoSignInError(err);
    const e = new Error(message);
    /** @type {{ field?: string }} */ (e).field = field;
    throw e;
  }
}
