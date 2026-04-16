import { signOut as amplifySignOut } from "aws-amplify/auth";
import { isCognitoConfigured } from "./amplifyConfig.js";

/**
 * Clear Cognito session (global sign-out from this device).
 */
export async function signOutWithCognito() {
  if (!isCognitoConfigured()) {
    throw new Error(
      "Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID in .env.local.",
    );
  }

  await amplifySignOut({ global: true });
}
