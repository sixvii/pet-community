import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import type { FormEvent } from "react";
import { authenticateAdmin } from "../data/admin-api";

export function meta() {
  return [{ title: "Admin login — Pawly" }];
}

export default function AdminLoginRoute() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const created = new URLSearchParams(search).get("created") === "1";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const account = await authenticateAdmin(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      if (!account) {
        setError("Email or password is incorrect.");
        setSubmitting(false);
        return;
      }
      navigate(account.mustChangePassword ? "/admin/password-change" : `/admin?role=${account.role}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in right now. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="grid h-dvh min-h-[560px] w-full place-items-center overflow-hidden bg-black font-sans text-[14.5px] leading-[1.5] text-[#f7f7f7] max-[700px]:flex max-[700px]:h-auto max-[700px]:min-h-dvh max-[700px]:flex-col max-[700px]:overflow-auto">
      <div className="grid h-full w-full max-w-6xl grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)] items-center max-[700px]:flex max-[700px]:min-h-dvh max-[700px]:flex-col">
        <section className="flex min-w-0 flex-col bg-black px-[clamp(14px,2vw,34px)] py-[22px] max-[700px]:min-h-[70dvh] max-[700px]:px-[22px] max-[700px]:pt-5 max-[700px]:pb-7">
          <div className="my-auto w-full max-[700px]:mx-auto max-[700px]:mt-9 max-[700px]:max-w-[440px]">
            <h1 className="my-[14px] mb-4 text-[60px] font-extrabold leading-[0.95]">Happening<br />now.</h1>
            <p className="mb-[30px] text-[16px] text-[#aaa]">Sign in to manage the Pawly community and dashboard.</p>
            {created && <p className="mb-4 border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-200" role="status">Admin account created. Sign in with its temporary password.</p>}
            <form className="flex flex-col gap-[25px]" onSubmit={submit}>
              <label className="flex flex-col gap-[10px] text-[16px] font-semibold text-[#d0d0d0]">
                Email address
                <input className="h-[52px] w-full max-w-[420px] rounded-[7px] border border-[#222222] bg-black px-[10px] text-base text-[#f7f7f7] outline-none placeholder:text-[#777] focus:border-[#222222]" type="email" name="email" required autoComplete="username" placeholder="" />
              </label>
              <label className="flex flex-col gap-[10px] text-[16px] font-semibold text-[#d0d0d0]">
                Password
                <input className="h-[52px] w-full max-w-[420px] rounded-[7px] border border-[#222222] bg-black px-[10px] text-base text-[#f7f7f7] outline-none placeholder:text-[#777] focus:border-[#222222]" type="password" name="password" required autoComplete="current-password" placeholder="" />
              </label>
              {error && <p className="border border-rose-800 bg-rose-950 px-3 py-2 text-sm text-rose-200" role="alert">{error}</p>}
              <button className="mt-1 min-h-[54px] w-full rounded-lg border border-[#f7f8fa] bg-[#f7f8fa] px-3.5 text-base font-semibold text-[#101010] transition-colors hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Continue"}</button>
            </form>
          </div>
        </section>
        <section className="relative grid h-[min(68dvh,520px)] w-[min(100%,420px)] min-w-0 justify-self-center place-items-center overflow-hidden bg-black max-[700px]:h-[190px] max-[700px]:min-h-[190px] max-[700px]:w-[min(72%,280px)]" aria-label="Pawly admin portal artwork">
          <img className="block h-full w-full bg-black object-contain" src="/adminimg.png" alt="Pawly admin portal artwork" />
        </section>
      </div>
    </main>
  );
}
