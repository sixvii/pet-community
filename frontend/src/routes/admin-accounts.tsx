import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { changeAdminPassword, createAdminAccount, getAdminSession } from "../data/admin-api";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";

function AdminArtwork() {
  return (
    <section className="relative hidden h-screen overflow-hidden bg-black text-white lg:block" aria-label="Pawly administration">
      <img src="/adminimg.png" alt="Pawly" className="absolute inset-0 m-auto h-[50%] w-[72%] object-contain opacity-90" />
      <div className="absolute bottom-12 left-12 right-12">
        <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-white/60">Pawly · Administration</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight">A safer community starts with a thoughtful team.</h1>
      </div>
    </section>
  );
}

const fieldClass = "mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
const buttonClass = "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-700 px-5 text-base font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60";
const createAdminButtonClass = "flex min-h-12 w-fit items-center justify-center rounded-md bg-black px-8 text-base font-semibold text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-wait disabled:opacity-60";

export function AdminCreateUserRoute() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const currentAccount = session?.account ?? null;
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!currentAccount || currentAccount.status !== "active") return <Navigate to="/admin/login" replace />;
  if (currentAccount.mustChangePassword) return <Navigate to="/admin/password-change" replace />;
  if (currentAccount.role !== "superadmin") return <Navigate to="/admin" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const temporaryPassword = String(form.get("temporary-password") ?? "");
    const confirmPassword = String(form.get("confirm-password") ?? "");
    if (temporaryPassword !== confirmPassword) {
      setError("Temporary passwords do not match.");
      setSaving(false);
      return;
    }

    try {
      await createAdminAccount({ email, temporaryPassword, role: "admin" });
      navigate("/admin?role=superadmin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create this admin account.");
      setSaving(false);
    }
  };

  return (
    <main className="grid h-screen overflow-hidden bg-[#F8F9FA] font-poppins text-slate-900 lg:grid-cols-2">
      <AdminArtwork />
      <section className="flex h-screen items-center justify-center overflow-hidden px-6 py-8 sm:px-10">
        <form onSubmit={submit} className="w-full max-w-md">
          <Link to="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-900">← Admin dashboard</Link>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Superadmin · Team access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Create admin user</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Set up a sign-in for a new administrator. They’ll choose a new password after their first successful login.</p>

          <label className="mt-8 block text-sm font-semibold text-slate-700">
            Email address
            <input className={fieldClass} type="email" name="email" autoComplete="email" placeholder="admin@pawly.example" required />
          </label>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Temporary password
            <input className={fieldClass} type={showTemporaryPassword ? "text" : "password"} name="temporary-password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
          </label>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" checked={showTemporaryPassword} onChange={(event) => setShowTemporaryPassword(event.target.checked)} className="size-4 accent-black" />
            Show password
          </label>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Confirm temporary password
            <input className={fieldClass} type={showConfirmPassword ? "text" : "password"} name="confirm-password" autoComplete="new-password" minLength={8} placeholder="Re-enter temporary password" required />
          </label>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" checked={showConfirmPassword} onChange={(event) => setShowConfirmPassword(event.target.checked)} className="size-4 accent-black" />
            Show password
          </label>
          {error && <p className="mt-4 text-sm font-medium text-rose-700" role="alert">{error}</p>}
          <button className={`${createAdminButtonClass} mt-7`} type="submit" disabled={saving}>{saving ? "Creating account…" : "Create admin user"}</button>
        </form>
      </section>
    </main>
  );
}

export function AdminPasswordChangeRoute() {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!session) return <Navigate to="/admin/login" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("new-password") ?? "");
    const confirmation = String(form.get("confirm-password") ?? "");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await changeAdminPassword(password);
      navigate(`/admin?role=${session.role}`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update password.");
      setSaving(false);
    }
  };

  return (
    <main className="grid h-screen overflow-hidden bg-[#F8F9FA] font-poppins text-slate-900 lg:grid-cols-2">
      <AdminArtwork />
      <section className="flex h-screen items-center justify-center overflow-hidden px-6 py-8 sm:px-10">
        <form onSubmit={submit} className="w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Secure your account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Change your password</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Your temporary password has been used. Choose a new password to continue to the dashboard.</p>
          <label className="mt-8 block text-sm font-semibold text-slate-700">
            New password
            <input className={fieldClass} type={showNewPassword ? "text" : "password"} name="new-password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
          </label>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" checked={showNewPassword} onChange={(event) => setShowNewPassword(event.target.checked)} className="size-4 accent-black" />
            Show password
          </label>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            Confirm new password
            <input className={fieldClass} type={showConfirmPassword ? "text" : "password"} name="confirm-password" autoComplete="new-password" minLength={8} placeholder="Re-enter new password" required />
          </label>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" checked={showConfirmPassword} onChange={(event) => setShowConfirmPassword(event.target.checked)} className="size-4 accent-black" />
            Show password
          </label>
          {error && <p className="mt-4 text-sm font-medium text-rose-700" role="alert">{error}</p>}
          <button className={`${buttonClass} mt-7`} type="submit" disabled={saving}>{saving ? "Updating password…" : "Save new password"}</button>
        </form>
      </section>
    </main>
  );
}
