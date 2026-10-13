import { AdminWorkspacePage } from "../pages/admin/AdminWorkspacePage";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { clearAdminSession, getAdminSession, logoutAdmin } from "../data/admin-api";
import "../components/pawly.css";

export function meta() {
  return [{ title: "Admin dashboard — Pawly" }];
}

export default function AdminDashboardRoute() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (["/admin/login", "/admin/create", "/admin/password-change"].includes(pathname)) return <Outlet />;

  const session = getAdminSession();
  const account = session?.account ?? null;
  if (!session || !account || account.status !== "active") {
    clearAdminSession();
    return <Navigate to="/admin/login" replace />;
  }
  if (account.mustChangePassword) return <Navigate to="/admin/password-change" replace />;

  const signOut = () => {
    void logoutAdmin().catch((error: unknown) => {
      console.error("Unable to revoke admin session:", error);
    });
    clearAdminSession();
    navigate("/admin/login");
  };

  return (
    <div className="pawly-app pawly-admin-dashboard">
      <AdminWorkspacePage onSignOut={signOut} role={account.role} />
    </div>
  );
}
