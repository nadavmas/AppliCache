/**
 * Matches backend Cognito password policy in template.yaml:
 * MinimumLength 8, RequireLowercase, RequireNumbers, RequireUppercase, RequireSymbols false.
 */
export const COGNITO_PASSWORD_RULES_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.";

export function passwordMeetsCognitoPoolRules(password) {
  if (!password || password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Sign-in only. Maps exceptions to `identifier` (email/username field) or `password`.
 *
 * Note: With User Pool Client **PreventUserExistenceErrors: ENABLED** (see backend template),
 * Cognito often returns **NotAuthorizedException** for both non-existent users and wrong
 * passwords — it will not return **UserNotFoundException** on sign-in. Use a single safe
 * message on the password field in that case; do not assume you can always show
 * "user not found" under the identifier field.
 */
export const SIGN_IN_BAD_CREDENTIALS_MESSAGE =
  "Incorrect email, username, or password.";

/**
 * @param {unknown} error
 * @returns {{ message: string; field?: string }}
 */
export function mapCognitoSignInError(error) {
  const name = /** @type {{ name?: string }} */ (error)?.name ?? "";
  const message =
    typeof /** @type {{ message?: string }} */ (error)?.message === "string"
      ? String(/** @type {{ message?: string }} */ (error).message)
      : "";

  if (name === "NotAuthorizedException") {
    return {
      message: SIGN_IN_BAD_CREDENTIALS_MESSAGE,
      field: "password",
    };
  }

  if (name === "UserNotFoundException") {
    return {
      message: "No account found with that email or username.",
      field: "identifier",
    };
  }

  if (name === "UserNotConfirmedException") {
    return {
      message:
        "Confirm your email before signing in. Check your inbox or complete sign-up.",
      field: "identifier",
    };
  }

  if (name === "PasswordResetRequiredException") {
    return {
      message: "You must reset your password before signing in.",
      field: "password",
    };
  }

  if (name === "InvalidParameterException") {
    return {
      message:
        message || "Some sign-in information is invalid. Check your details.",
    };
  }

  if (name === "LimitExceededException" || /Attempt limit exceeded/i.test(message)) {
    return {
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  if (name === "TooManyRequestsException") {
    return { message: "Too many requests. Try again later." };
  }

  if (message) {
    return { message };
  }

  return { message: "Sign-in failed. Please try again." };
}

/**
 * Normalize Amplify / Cognito errors for UI (message + optional field key).
 * @param {unknown} error
 * @returns {{ message: string; field?: string }}
 */
export function mapCognitoAuthError(error) {
  const name = /** @type {{ name?: string }} */ (error)?.name ?? "";
  const message =
    typeof /** @type {{ message?: string }} */ (error)?.message === "string"
      ? String(/** @type {{ message?: string }} */ (error).message)
      : "";

  if (
    name === "InvalidPasswordException" ||
    /password did not conform/i.test(message) ||
    /InvalidPasswordException/i.test(message)
  ) {
    return { message: COGNITO_PASSWORD_RULES_MESSAGE, field: "password" };
  }

  if (
    name === "UsernameExistsException" ||
    name === "AliasExistsException" ||
    /already exists/i.test(message)
  ) {
    return {
      message:
        "An account with this username or email already exists. Try signing in instead.",
    };
  }

  if (name === "InvalidParameterException") {
    return {
      message:
        message ||
        "Some information is invalid. Check your details and try again.",
    };
  }

  if (name === "LimitExceededException" || /Attempt limit exceeded/i.test(message)) {
    return {
      message: "Too many attempts. Please wait a few minutes and try again.",
    };
  }

  if (name === "NotAuthorizedException") {
    return { message: message || "Not authorized." };
  }

  if (name === "CodeMismatchException" || /mismatch/i.test(message)) {
    return {
      message: "That code doesn’t match. Check the email and try again.",
      field: "confirmationCode",
    };
  }

  if (name === "ExpiredCodeException" || /expired/i.test(message)) {
    return {
      message: "This code has expired. Request a new code below.",
      field: "confirmationCode",
    };
  }

  if (name === "UserNotFoundException") {
    return { message: "We couldn’t find that account. Try signing up again." };
  }

  if (message) {
    return { message };
  }

  return { message: "Something went wrong. Please try again." };
}
