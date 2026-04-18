import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import YearPage from "./components/YearPage";
import AdminPage from "./components/AdminPage";
import LoginPage from "./components/Auth/LoginPage";

const currentYear = new Date().getFullYear();

function PublicUserRedirect() {
  const { username } = useParams();
  return <Navigate to={`/u/${username}/year/${currentYear}`} replace />;
}

function RootRoute({ singleUserMode, adminUsername }) {
  if (singleUserMode && adminUsername) {
    return <Navigate to={`/u/${adminUsername}/year/${currentYear}`} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  const [appSettings, setAppSettings] = useState(null);

  useEffect(() => {
    fetch("/api/app-settings", { credentials: "include" })
      .then((r) => r.json())
      .then(setAppSettings)
      .catch(() => setAppSettings({ singleUserMode: false, adminUsername: null }));
  }, []);

  if (!appSettings) return null;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <RootRoute
            singleUserMode={appSettings.singleUserMode}
            adminUsername={appSettings.adminUsername}
          />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/year/:year" element={<YearPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/u/:username" element={<PublicUserRedirect />} />
      <Route path="/u/:username/year/:year" element={<YearPage />} />
      <Route
        path="*"
        element={<Navigate to={`/year/${currentYear}`} replace />}
      />
    </Routes>
  );
}
