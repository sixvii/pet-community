import { lazy } from "react";

export const AdminLoginRoute = lazy(() => import("./routes/admin_.login"));
export const AdminDashboardRoute = lazy(() => import("./routes/admin_"));
export const AdminCreateUserRoute = lazy(() =>
  import("./routes/admin-accounts").then((module) => ({
    default: module.AdminCreateUserRoute,
  })),
);
export const AdminPasswordChangeRoute = lazy(() =>
  import("./routes/admin-accounts").then((module) => ({
    default: module.AdminPasswordChangeRoute,
  })),
);
