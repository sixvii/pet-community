import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import "./components/pawly.css";
import PawlyApp from "./components/PawlyApp";
import {
  AdminCreateUserRoute,
  AdminDashboardRoute,
  AdminLoginRoute,
  AdminPasswordChangeRoute,
} from "./LazyRoutes";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="pawly-initial-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<PawlyApp />} />
          <Route path="/admin" element={<AdminDashboardRoute />}>
            <Route path="login" element={<AdminLoginRoute />} />
            <Route path="create" element={<AdminCreateUserRoute />} />
            <Route path="password-change" element={<AdminPasswordChangeRoute />} />
          </Route>
          <Route path="*" element={<PawlyApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);