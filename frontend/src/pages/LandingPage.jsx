import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
import {
  BRANDING_LOGO_LOCKUP_ALT,
  BRANDING_LOGO_LOCKUP_SRC,
} from "../branding.js";

export default function LandingPage() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(() => {
        if (!cancelled) setStatus("authed");
      })
      .catch(() => {
        if (!cancelled) setStatus("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="landing-page">
        <p
          className="hero__loading page-loading"
          role="status"
          aria-live="polite"
        >
          <span className="page-loading__label">Loading</span>
          <span className="page-loading__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </p>
      </main>
    );
  }

  if (status === "authed") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="landing-page landing-page--marketing">
      <div className="landing-page__guest">
        <section className="hero hero--guest" aria-labelledby="landing-guest-title">
          <h1 id="landing-guest-title" className="visually-hidden">
            {BRANDING_LOGO_LOCKUP_ALT}
          </h1>
          <img
            className="hero__logo"
            src={BRANDING_LOGO_LOCKUP_SRC}
            alt=""
            decoding="async"
          />
          <p className="hero__lede">
            Manage every application in one calm workspace—no spreadsheet chaos.
          </p>
          <div className="hero-actions hero-actions--guest">
            <Link to="/login" className="btn btn-secondary btn--landing-cta">
              Log in
            </Link>
            <Link to="/signup" className="btn btn-primary btn--landing-cta">
              Sign up
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
