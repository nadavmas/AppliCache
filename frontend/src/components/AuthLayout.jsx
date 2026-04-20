import { Link } from "react-router-dom";
import {
  BRANDING_LOGO_LOCKUP_ALT,
  BRANDING_LOGO_LOCKUP_SRC,
} from "../branding.js";

/**
 * Shared shell for login / sign-up: centered card, branding, optional footer link row.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  backTo = "/",
}) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <img
          className="auth-card__logo"
          src={BRANDING_LOGO_LOCKUP_SRC}
          alt={BRANDING_LOGO_LOCKUP_ALT}
        />
        <h1 className="auth-card__title">{title}</h1>
        {subtitle ? (
          <p className="auth-card__subtitle">{subtitle}</p>
        ) : null}
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
        <Link to={backTo} className="auth-back">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
