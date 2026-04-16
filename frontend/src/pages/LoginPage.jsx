import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { signIn } from "../auth/cognitoStub";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin({ email, password }) {
  const next = {};
  const e = email.trim();

  if (!e) {
    next.email = "Enter your email address.";
  } else if (!EMAIL_RE.test(e)) {
    next.email = "Enter a valid email address.";
  }

  if (!password) next.password = "Password is required.";

  return next;
}

export default function LoginPage() {
  const navigate = useNavigate();
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
      await signIn({
        username: email.trim(),
        password,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again.";
      const field = /** @type {{ field?: string }} */ (err)?.field;
      if (field === "email") {
        setFieldErrors((prev) => ({ ...prev, email: message }));
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
          <label htmlFor="login-email">Email</label>
          <p id="login-email-hint" className="auth-field-hint">
            Sign in with the email address you used to register.
          </p>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="auth-input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email)
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={emailInvalid}
            aria-describedby={
              emailInvalid ? "login-email-error" : "login-email-hint"
            }
          />
          {fieldErrors.email ? (
            <p
              id="login-email-error"
              className="auth-field-error"
              role="alert"
            >
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
