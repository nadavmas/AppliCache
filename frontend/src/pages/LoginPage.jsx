import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { signIn } from "../auth/cognitoStub";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Same pattern as sign-up username (Cognito username). */
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,128}$/;

function validateLogin({ identifier, password }) {
  const next = {};
  const id = identifier.trim();

  if (!id) {
    next.identifier = "Enter your email or username.";
  } else if (id.includes("@")) {
    if (!EMAIL_RE.test(id))
      next.identifier = "Enter a valid email address.";
  } else if (!USERNAME_RE.test(id)) {
    next.identifier =
      "Use 3–128 characters: letters, numbers, periods, underscores, or hyphens.";
  }

  if (!password) next.password = "Password is required.";

  return next;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const identifierInvalid = Boolean(fieldErrors.identifier);
  const passwordInvalid = Boolean(fieldErrors.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const next = validateLogin({ identifier, password });
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({
        username: identifier.trim(),
        password,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      const field = /** @type {{ field?: string }} */ (err)?.field;
      if (field === "identifier") {
        setFieldErrors((prev) => ({ ...prev, identifier: message }));
      } else if (field === "password") {
        setFieldErrors((prev) => ({ ...prev, password: message }));
      } else {
        setFormError(message);
      }
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
          <label htmlFor="login-identifier">Email or username</label>
          <input
            id="login-identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            className="auth-input"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (fieldErrors.identifier)
                setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
            }}
            aria-invalid={identifierInvalid}
            aria-describedby={
              identifierInvalid ? "login-identifier-error" : undefined
            }
          />
          {fieldErrors.identifier ? (
            <p
              id="login-identifier-error"
              className="auth-field-error"
              role="alert"
            >
              {fieldErrors.identifier}
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
