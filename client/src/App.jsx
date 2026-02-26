import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import LoginModal from "./components/LoginModal";
import BookModal from "./components/BookModal";
import YearPage from "./components/YearPage";

const currentYear = new Date().getFullYear();

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/year/${currentYear}`} replace />}
      />
      <Route path="/year/:year" element={<YearPage />} />
      <Route
        path="*"
        element={<Navigate to={`/year/${currentYear}`} replace />}
      />
    </Routes>
  );
}
