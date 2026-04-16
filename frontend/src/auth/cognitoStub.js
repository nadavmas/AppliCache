/**
 * Auth API — sign-up via `cognitoSignup.js`, sign-in via `cognitoLogin.js`.
 */

export { signUp } from "./cognitoSignup.js";
export { signInWithCognito as signIn } from "./cognitoLogin.js";
export { signOutWithCognito as signOut } from "./cognitoLogout.js";
