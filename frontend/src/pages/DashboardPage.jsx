import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";
import { signOut } from "../auth/cognitoStub";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking");
  const [displayName, setDisplayName] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setDisplayName(user.username ?? "");
          setStatus("authed");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    setLogoutError("");
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (err) {
      setLogoutError(
        err instanceof Error ? err.message : "Could not sign out. Try again.",
      );
    } finally {
      setSigningOut(false);
    }
  };

  if (status === "checking") {
    return (
      <main className="landing-page">
        <p className="hero" style={{ textAlign: "center", color: "#64748b" }}>
          Loading…
        </p>
      </main>
    );
  }

  if (status === "guest") {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="landing-page">
      <section className="hero">
        <h1>Dashboard</h1>
        <p>
          {displayName
            ? `Welcome back, ${displayName}.`
            : "Welcome to your AppliCache home."}
        </p>
        <p style={{ fontSize: "1rem", color: "#64748b", marginTop: 16 }}>
          Your applications overview will appear here.
        </p>
        {logoutError ? (
          <p className="auth-form-error" role="alert" style={{ marginTop: 16 }}>
            {logoutError}
          </p>
        ) : null}
        <div className="hero-actions" style={{ marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Log out"}
          </button>
        </div>
      </section>
    </main>
  );
}
