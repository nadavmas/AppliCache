import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
        <div className="hero-actions" style={{ marginTop: 24 }}>
          <Link to="/" className="btn btn-secondary">
            Marketing site
          </Link>
        </div>
      </section>
    </main>
  );
}
