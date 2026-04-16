import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { signUp } from "../auth/cognitoStub";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;
/** Cognito-style username: letters, numbers, . _ - */
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,128}$/;

function parseDateOnly(value) {
  if (!value) return null;
  const d = new Date(value + "T12:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function validateSignup(values) {
  const {
    firstName,
    lastName,
    dateOfBirth,
    username,
    email,
    password,
    confirmPassword,
  } = values;
  const next = {};

  if (!firstName.trim()) next.firstName = "First name is required.";
  if (!lastName.trim()) next.lastName = "Last name is required.";

  if (!dateOfBirth) next.dateOfBirth = "Date of birth is required.";
  else {
    const dob = parseDateOnly(dateOfBirth);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (!dob) next.dateOfBirth = "Enter a valid date.";
    else if (dob > today) next.dateOfBirth = "Date cannot be in the future.";
    else {
      const min = new Date(1900, 0, 1);
      if (dob < min) next.dateOfBirth = "Enter a realistic date of birth.";
    }
  }

  const u = username.trim();
  if (!u) next.username = "Username is required.";
  else if (!USERNAME_RE.test(u))
    next.username =
      "Use 3–128 characters: letters, numbers, periods, underscores, or hyphens.";

  if (!email.trim()) next.email = "Email is required.";
  else if (!EMAIL_RE.test(email.trim()))
    next.email = "Enter a valid email address.";

  if (!password) next.password = "Password is required.";
  else if (password.length < MIN_PASSWORD_LEN)
    next.password = `Use at least ${MIN_PASSWORD_LEN} characters.`;

  if (!confirmPassword) next.confirmPassword = "Confirm your password.";
  else if (password !== confirmPassword)
    next.confirmPassword = "Passwords do not match.";

  return next;
}

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clearField = (key) => {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const next = validateSignup({
      firstName,
      lastName,
      dateOfBirth,
      username,
      email,
      password,
      confirmPassword,
    });
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        username: username.trim(),
        email: email.trim(),
        password,
      });
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
      title="Create your account"
      subtitle="Start managing your applications in one place."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="auth-form-error" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="auth-row">
          <div className="auth-field">
            <label htmlFor="signup-first-name">First name</label>
            <input
              id="signup-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              className="auth-input"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) clearField("firstName");
              }}
              aria-invalid={Boolean(fieldErrors.firstName)}
              aria-describedby={
                fieldErrors.firstName ? "signup-first-name-error" : undefined
              }
            />
            {fieldErrors.firstName ? (
              <p
                id="signup-first-name-error"
                className="auth-field-error"
                role="alert"
              >
                {fieldErrors.firstName}
              </p>
            ) : null}
          </div>
          <div className="auth-field">
            <label htmlFor="signup-last-name">Last name</label>
            <input
              id="signup-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              className="auth-input"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) clearField("lastName");
              }}
              aria-invalid={Boolean(fieldErrors.lastName)}
              aria-describedby={
                fieldErrors.lastName ? "signup-last-name-error" : undefined
              }
            />
            {fieldErrors.lastName ? (
              <p
                id="signup-last-name-error"
                className="auth-field-error"
                role="alert"
              >
                {fieldErrors.lastName}
              </p>
            ) : null}
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="signup-dob">Date of birth</label>
          <input
            id="signup-dob"
            name="dateOfBirth"
            type="date"
            className="auth-input"
            value={dateOfBirth}
            onChange={(e) => {
              setDateOfBirth(e.target.value);
              if (fieldErrors.dateOfBirth) clearField("dateOfBirth");
            }}
            aria-invalid={Boolean(fieldErrors.dateOfBirth)}
            aria-describedby={
              fieldErrors.dateOfBirth ? "signup-dob-error" : undefined
            }
          />
          {fieldErrors.dateOfBirth ? (
            <p id="signup-dob-error" className="auth-field-error" role="alert">
              {fieldErrors.dateOfBirth}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            name="username"
            type="text"
            autoComplete="username"
            className="auth-input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) clearField("username");
            }}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={
              fieldErrors.username ? "signup-username-error" : undefined
            }
          />
          {fieldErrors.username ? (
            <p
              id="signup-username-error"
              className="auth-field-error"
              role="alert"
            >
              {fieldErrors.username}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            className="auth-input"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) clearField("email");
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="signup-email-error" className="auth-field-error" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="auth-input"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) clearField("password");
            }}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "signup-password-error" : undefined
            }
          />
          {fieldErrors.password ? (
            <p
              id="signup-password-error"
              className="auth-field-error"
              role="alert"
            >
              {fieldErrors.password}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="auth-input"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) clearField("confirmPassword");
            }}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={
              fieldErrors.confirmPassword ? "signup-confirm-error" : undefined
            }
          />
          {fieldErrors.confirmPassword ? (
            <p
              id="signup-confirm-error"
              className="auth-field-error"
              role="alert"
            >
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn--block"
          disabled={submitting}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
