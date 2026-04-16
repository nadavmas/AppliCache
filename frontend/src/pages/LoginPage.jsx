import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { signIn } from "../auth/cognitoStub";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;

function validateLogin({ email, password }) {
  const next = {};
  if (!email.trim()) next.email = "Email is required.";
  else if (!EMAIL_RE.test(email.trim()))
    next.email = "Enter a valid email address.";
  if (!password) next.password = "Password is required.";
  else if (password.length < MIN_PASSWORD_LEN)
    next.password = `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
  return next;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailInvalid = Boolean(fieldErrors.email);
  const passwordInvalid = Boolean(fieldErrors.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const next = validateLogin({ email, password });
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup">Create one</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="auth-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email)
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? "login-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="login-email-error" className="auth-field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="auth-input"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password)
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aria-invalid={passwordInvalid}
            aria-describedby={
              passwordInvalid ? "login-password-error" : undefined
            }
          />
          {fieldErrors.password ? (
            <p
              id="login-password-error"
              className="auth-field-error"
              role="alert"
            >
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="auth-toolbar">
          <span />
          <span
            className="auth-link auth-link--disabled"
            title="Coming soon"
            aria-disabled="true"
          >
            Forgot password?
          </span>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn--block"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
