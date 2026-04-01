import { useState, useEffect, useRef } from "react";

function LoginModal({ open, onClose, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setPassword("");
      setError("");
      setLoading(false);
    } else {
      setTimeout(() => usernameRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      id="login-modal"
      className="modal open"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content modal-content--narrow">
        <div className="modal-header">
          <h2 id="login-modal-title">Login</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="modal-body">

        <form
          id="login-form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setLoading(true);
            try {
              await onLogin(username, password);
              onClose();
            } catch {
              setError("Incorrect username or password.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="form-group">
            <label htmlFor="login-username">Username</label>
            <input
              type="text"
              id="login-username"
              ref={usernameRef}
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              id="login-submit-btn"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
