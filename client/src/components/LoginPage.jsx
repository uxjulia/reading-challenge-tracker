import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const currentYear = new Date().getFullYear();

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const usernameRef = useRef(null);

  useEffect(() => {
    fetch("/auth/status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          navigate(`/year/${currentYear}`, { replace: true });
        } else {
          setChecking(false);
          setTimeout(() => usernameRef.current?.focus(), 50);
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Login failed");
      }
      navigate(`/year/${currentYear}`, { replace: true });
    } catch (err) {
      setError(err.message || "Incorrect username or password.");
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div className="login-page">
      <div className="login-page-card">
        <div className="login-page-icon">
          <span class="material-symbols-outlined">auto_stories</span>
        </div>
        <h1 className="login-page-title">Reading Challenge</h1>
        <form noValidate onSubmit={handleSubmit} className="login-page-form">
          <div className="form-group">
            <label htmlFor="lp-username">Username</label>
            <input
              id="lp-username"
              ref={usernameRef}
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="lp-password">Password</label>
            <input
              id="lp-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            type="submit"
            className="btn-primary login-page-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
