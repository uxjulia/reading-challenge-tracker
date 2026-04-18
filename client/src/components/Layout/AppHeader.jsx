import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChartNoAxesColumn,
  CircleUser,
  ChevronDown,
  Check,
  Share2,
  UserRoundCog,
  LogOut,
} from "lucide-react";

export const AppHeader = ({
  title,
  isAuthenticated,
  isAdmin,
  appUser,
  isPublicUser,
  onOpenLogin,
  onOpenStats,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="app-header">
      <h1 onClick={() => !isAuthenticated && onOpenLogin()}>{title}</h1>
      <div className="header-auth">
        {isAuthenticated && (
          <button
            className="btn-stats-icon btn-auth"
            onClick={onOpenStats}
            aria-label="View reading stats"
            type="button"
          >
            <ChartNoAxesColumn strokeWidth={3} size={16} aria-hidden="true" />
          </button>
        )}
        {isAuthenticated ? (
          <div className="user-menu" ref={menuRef}>
            <button
              className="btn-auth btn-user-menu"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <CircleUser size={16} aria-hidden="true" />
              <span className="user-menu-name">{appUser}</span>
              <ChevronDown size={16} className="user-menu-chevron" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="user-menu-dropdown" role="menu">
                <button
                  className="user-menu-item"
                  role="menuitem"
                  onClick={() => {
                    const url = `${window.location.origin}/u/${appUser}`;
                    navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    setTimeout(() => {
                      setShareCopied(false);
                      setMenuOpen(false);
                    }, 1500);
                  }}
                >
                  {shareCopied ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Share2 size={16} aria-hidden="true" />
                  )}
                  {shareCopied ? "Copied!" : "Copy public link"}
                </button>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="user-menu-item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserRoundCog size={16} aria-hidden="true" />
                    Admin
                  </Link>
                )}
                <button
                  className="user-menu-item user-menu-item--logout"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : isPublicUser ? null : (
          <button className="btn-auth" onClick={onOpenLogin}>
            Login
          </button>
        )}
      </div>
    </header>
  );
};
