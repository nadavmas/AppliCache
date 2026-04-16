import {
  signUp as amplifySignUp,
  confirmSignUp,
  resendSignUpCode,
} from "aws-amplify/auth";
import { isCognitoConfigured } from "./amplifyConfig.js";
import { mapCognitoAuthError } from "./cognitoAuthErrors.js";

/** Aligns with Cognito pools where usernames are case-insensitive (stored/compared as lowercase). */
function canonicalPoolUsername(username) {
  return username.trim().toLowerCase();
}

/**
 * Register a user in Cognito (SRP-enabled app client, no secret).
 * Maps form fields to standard attributes: given_name, family_name, birthdate, email.
 *
 * @param {{
 *   firstName: string;
 *   lastName: string;
 *   dateOfBirth: string;
 *   username: string;
 *   email: string;
 *   password: string;
 * }} input
 * @returns {Promise<{ needsEmailConfirmation: boolean; userId?: string }>}
 */
export async function signUp(input) {
  if (!isCognitoConfigured()) {
    throw new Error(
      "Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID in .env.local.",
    );
  }

  const {
    firstName,
    lastName,
    dateOfBirth,
    username,
    email,
    password,
  } = input;

  try {
    const { isSignUpComplete, userId, nextStep } = await amplifySignUp({
      username: canonicalPoolUsername(username),
      password,
      options: {
        userAttributes: {
          email,
          given_name: firstName,
          family_name: lastName,
          birthdate: dateOfBirth,
        },
      },
    });

    if (isSignUpComplete) {
      return { needsEmailConfirmation: false, userId };
    }

    const step = nextStep?.signUpStep;
    if (step === "CONFIRM_SIGN_UP") {
      return { needsEmailConfirmation: true, userId };
    }

    return { needsEmailConfirmation: true, userId };
  } catch (err) {
    const { message, field } = mapCognitoAuthError(err);
    const e = new Error(message);
    /** @type {{ field?: string }} */ (e).field = field;
    throw e;
  }
}

/**
 * Confirm sign-up with the code emailed by Cognito.
 * @param {{ username: string; confirmationCode: string }} input
 */
export async function confirmUserSignUp(input) {
  if (!isCognitoConfigured()) {
    throw new Error(
      "Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID in .env.local.",
    );
  }

  const { username, confirmationCode } = input;

  try {
    await confirmSignUp({
      username: canonicalPoolUsername(username),
      confirmationCode: confirmationCode.trim(),
    });
  } catch (err) {
    const { message, field } = mapCognitoAuthError(err);
    const e = new Error(message);
    /** @type {{ field?: string }} */ (e).field = field;
    throw e;
  }
}

/**
 * Resend the email verification code.
 * @param {{ username: string }} input
 */
export async function resendUserVerificationCode(input) {
  if (!isCognitoConfigured()) {
    throw new Error(
      "Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_USER_POOL_CLIENT_ID in .env.local.",
    );
  }

  try {
    await resendSignUpCode({
      username: canonicalPoolUsername(input.username),
    });
  } catch (err) {
    const { message } = mapCognitoAuthError(err);
    throw new Error(message);
  }
}
