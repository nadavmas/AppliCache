import { Amplify } from "aws-amplify";

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const hostedUiDomain = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN;

if (userPoolId && userPoolClientId) {
  const redirectBase =
    typeof window !== "undefined" ? window.location.origin : "";

  /** @type {{ email: boolean; username: boolean; oauth?: Record<string, unknown> }} */
  const loginWith = {
    email: true,
    username: false,
  };

  if (hostedUiDomain && String(hostedUiDomain).trim() && redirectBase) {
    loginWith.oauth = {
      domain: String(hostedUiDomain).trim(),
      scopes: ["openid", "email", "profile"],
      redirectSignIn: [`${redirectBase}/`],
      redirectSignOut: [`${redirectBase}/`],
      responseType: "code",
    };
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith,
      },
    },
  });
}

export function isCognitoConfigured() {
  return Boolean(userPoolId && userPoolClientId);
}
