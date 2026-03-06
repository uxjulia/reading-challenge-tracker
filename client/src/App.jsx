import { Navigate, Route, Routes, useParams } from "react-router-dom";
import YearPage from "./components/YearPage";
import AdminPage from "./components/AdminPage";
import LoginPage from "./components/LoginPage";

const currentYear = new Date().getFullYear();

function PublicUserRedirect() {
  const { username } = useParams();
  return <Navigate to={`/u/${username}/year/${currentYear}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
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
