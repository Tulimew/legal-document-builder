"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
    if (response.ok) router.push("/"); else { setMessage("Tên đăng nhập hoặc mật khẩu không đúng."); setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-md items-center px-6"><section className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Đăng nhập</h1><p className="mt-2 text-sm text-slate-600">Legal Document Builder</p><form className="mt-8 space-y-5" onSubmit={submit}><label className="block text-sm font-medium">Tên đăng nhập<input name="username" autoComplete="username" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="block text-sm font-medium">Mật khẩu<input name="password" type="password" autoComplete="current-password" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>{message && <p role="alert" className="text-sm text-red-700">{message}</p>}<button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{busy ? "Đang xác thực…" : "Đăng nhập"}</button></form></section></main>;
}
