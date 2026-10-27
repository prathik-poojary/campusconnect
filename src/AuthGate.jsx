import { useEffect, useState } from "react";
import {
  GraduationCap,
  Mail,
  LockKeyhole,
  UserRound,
  ArrowRight,
} from "lucide-react";
import App from "./App";
import "./auth.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8085/api";

async function authRequest(path, options = {}) {
  const response = await fetch(`${API}/auth${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    authRequest("/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const data = await authRequest(registering ? "/register" : "/login", {
        method: "POST",
        body: JSON.stringify(
          registering ? { name, email, password } : { email, password },
        ),
      });

      setUser(data.user);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await authRequest("/logout", { method: "POST" });
      setUser(null);
      setPassword("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  if (checking) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Preparing your campus workspace...</p>
      </div>
    );
  }

  if (user) {
    return <App user={user} onLogout={handleLogout} />;
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <GraduationCap size={27} />
          </div>
          <div>
            <div className="auth-brand-name">
              campus<span>connect</span>
            </div>
            <p>STUDENT COMMUNITY</p>
          </div>
        </div>

        <div className="auth-intro">
          <span className="auth-eyebrow">YOUR CAMPUS. YOUR COMMUNITY.</span>
          <h1>{registering ? "Find your people." : "Welcome back."}</h1>
          <p>
            {registering
              ? "Create your student account and start connecting."
              : "Sign in to continue to your campus workspace."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {registering && (
            <label>
              Full name
              <span className="auth-input-wrap">
                <UserRound size={17} />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                  required
                />
              </span>
            </label>
          )}

          <label>
            Email address
            <span className="auth-input-wrap">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label>
            Password
            <span className="auth-input-wrap">
              <LockKeyhole size={17} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                maxLength={128}
                autoComplete={registering ? "new-password" : "current-password"}
                required
              />
            </span>
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="auth-submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : registering
                ? "Create account"
                : "Sign in"}
            {!busy && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="auth-switch">
          {registering ? "Already have an account?" : "New to CampusConnect?"}{" "}
          <button
            type="button"
            onClick={() => {
              setRegistering(!registering);
              setError("");
            }}
          >
            {registering ? "Sign in" : "Create account"}
          </button>
        </div>

        <p className="auth-footnote">
          Built for students, powered by community.
        </p>
      </section>
    </main>
  );
}
