import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import Layout from "@/components/layout/Layout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import MealsPage from "@/pages/MealsPage";
import ReportsPage from "@/pages/ReportsPage";
import GoalsPage from "@/pages/GoalsPage";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to="/" replace /> : <SignupPage />}
        />
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm",
          duration: 3000,
        }}
      />
    </BrowserRouter>
  );
}
