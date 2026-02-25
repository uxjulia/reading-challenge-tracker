import { useState, useEffect } from "react";
function LoginModal({ open, onClose, onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      setLoading(false);
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
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <h2 id="login-modal-title">Login</h2>
        <p className="login-subtitle">Enter your password to make changes.</p>

        <form
          id="login-form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setLoading(true);
            try {
              await onLogin(password);
              onClose();
            } catch {
              setError("Incorrect password.");
            } finally {
              setLoading(false);
            }
          }}
        >
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
  );
}

export default LoginModal;
