import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NewOrderPage } from "./pages/NewOrderPage";
import { KhataRegisterPage } from "./pages/KhataRegisterPage";
import { CustomerLedgerPage } from "./pages/CustomerLedgerPage";
import { StockRegisterPage } from "./pages/StockRegisterPage";
import { ChallanRegisterPage } from "./pages/ChallanRegisterPage";
import { RemindersPage } from "./pages/RemindersPage";
import { MastersPage } from "./pages/MastersPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/orders/new" element={<NewOrderPage />} />
                <Route path="/khata" element={<KhataRegisterPage />} />
                <Route path="/khata/:customerId" element={<CustomerLedgerPage />} />
                <Route path="/stock" element={<StockRegisterPage />} />
                <Route path="/challans" element={<ChallanRegisterPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/masters" element={<MastersPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
