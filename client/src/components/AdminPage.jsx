import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const currentYear = new Date().getFullYear();

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

function ResetPasswordModal({ user, onClose, onSave }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  return (
    <div className="modal open" role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content modal-content--narrow">
        <button
          className="modal-close"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          ×
        </button>
        <h2>Reset Password</h2>
        <p className="login-subtitle">
          Set a new password for <strong>{user.username}</strong>.
        </p>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setLoading(true);
            try {
              await onSave(user.id, password);
              onClose();
            } catch (err) {
              setError(err.message || "Failed to reset password.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="form-group">
            <label htmlFor="reset-password">New Password</label>
            <input
              type="password"
              id="reset-password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Enter new password"
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUserForm({ onAdd, hasAdmin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onAdd(username, password, isAdmin);
      setUsername("");
      setPassword("");
      setIsAdmin(false);
    } catch (err) {
      setError(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-add-user-form" noValidate onSubmit={handleSubmit}>
      <h2>Add User</h2>
      <div className="admin-add-user-fields">
        <div className="form-group">
          <input
            type="text"
            id="new-username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            placeholder="Username"
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            id="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Password"
          />
        </div>
        {!hasAdmin && (
          <div className="form-group form-group--checkbox">
            <label>
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              Admin
            </label>
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Adding..." : "Add User"}
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
    </form>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState(null);
  const [pageError, setPageError] = useState("");
  const [singleUserMode, setSingleUserMode] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  async function loadData() {
    try {
      const [status, userList, settings] = await Promise.all([
        apiFetch("/auth/status"),
        apiFetch("/admin/users"),
        apiFetch("/admin/settings"),
      ]);
      if (!status.authenticated || !status.isAdmin) {
        navigate(`/year/${currentYear}`, { replace: true });
        return;
      }
      setCurrentUserId(status.userId);
      setUsers(userList);
      setSingleUserMode(settings.singleUserMode);
    } catch (err) {
      if (
        err.message.includes("403") ||
        err.message.includes("401") ||
        err.message === "Admin access required"
      ) {
        navigate(`/year/${currentYear}`, { replace: true });
      } else {
        setPageError(err.message || "Failed to load.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSingleUserMode(value) {
    setSettingsSaving(true);
    try {
      const updated = await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ singleUserMode: value }),
      });
      setSingleUserMode(updated.singleUserMode);
    } finally {
      setSettingsSaving(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(username, password, isAdmin) {
    await apiFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, isAdmin }),
    });
    await loadData();
  }

  async function handleResetPassword(userId, password) {
    await apiFetch(`/admin/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password }),
    });
  }

  async function handleDelete(user) {
    if (
      !window.confirm(
        `Delete user "${user.username}"? This will permanently delete all their books and data.`
      )
    )
      return;
    await apiFetch(`/admin/users/${user.id}`, { method: "DELETE" });
    await loadData();
  }

  if (loading) return null;
  if (pageError) return <div className="app-loading">{pageError}</div>;

  return (
    <div className="admin-page">
      <header className="app-header">
        <h1>Admin</h1>
        <div className="header-auth">
          <Link to={`/year/${currentYear}`} className="btn-auth">
            ← Back
          </Link>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-settings-section">
          <h2>Settings</h2>
          <div className="admin-setting-row">
            <label className="admin-setting-label">
              <input
                type="checkbox"
                checked={singleUserMode}
                disabled={settingsSaving}
                onChange={(e) => handleToggleSingleUserMode(e.target.checked)}
              />
              Single-user mode
            </label>
            <p className="admin-setting-description">
              When enabled, the home page shows your bookshelf directly instead of the login screen.
            </p>
          </div>
        </div>

        <AddUserForm onAdd={handleAdd} hasAdmin={users.some((u) => u.is_admin)} />

        <div className="admin-users-section">
          <h2>Users</h2>
          {users.length === 0 ? (
            <p className="admin-empty">No users yet.</p>
          ) : (
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>
                      {user.is_admin ? (
                        <span className="admin-badge">Admin</span>
                      ) : (
                        <span className="user-badge">User</span>
                      )}
                    </td>
                    <td className="admin-actions-cell">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setResetTarget(user)}
                      >
                        Reset Password
                      </button>
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUserId}
                        title={
                          user.id === currentUserId
                            ? "Cannot delete your own account"
                            : undefined
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ResetPasswordModal
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onSave={handleResetPassword}
      />
    </div>
  );
}
