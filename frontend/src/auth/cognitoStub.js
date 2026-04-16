/**
 * Placeholder auth API — replace bodies with AWS Cognito (Amplify Auth, amazon-cognito-identity-js, etc.)
 * once User Pool, App Client, and region are configured.
 */

/**
 * @param {{ email: string; password: string }} credentials
 * @returns {Promise<{ email: string }>}
 */
export function signIn(credentials) {
  return Promise.reject(
    new Error(
      "Cognito not configured: wire signIn to your User Pool (e.g. Amplify Auth.signIn).",
    ),
  );
}

/**
 * Registration payload — map to Cognito attributes when wiring (e.g. given_name,
 * family_name, birthdate, preferred_username vs username alias per your pool).
 *
 * @param {{
 *   email: string;
 *   password: string;
 *   firstName: string;
 *   lastName: string;
 *   dateOfBirth: string;
 *   username: string;
 * }} credentials
 * @returns {Promise<{ email: string }>}
 */
export function signUp(credentials) {
  return Promise.reject(
    new Error(
      "Cognito not configured: wire signUp to your User Pool (e.g. Amplify Auth.signUp).",
    ),
  );
}

/**
 * @returns {Promise<void>}
 */
export function signOut() {
  return Promise.reject(
    new Error(
      "Cognito not configured: wire signOut (e.g. Amplify Auth.signOut).",
    ),
  );
}
