"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export default function AccountPage() {
  const supabase = useMemo(() => supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null, []);
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/account` }
        });
        if (authError) throw authError;
        if (data.session) setSession(data.session);
        else setMessage("تم إنشاء الحساب. راجعي بريدك الإلكتروني واضغطي رابط التأكيد لتفعيل الحساب.");
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        setSession(data.session);
        setMessage("تم تسجيل الدخول بنجاح.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إتمام العملية. حاولي مرة أخرى.");
    } finally { setBusy(false); }
  }

  async function googleLogin() {
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` }
    });
    if (authError) { setError(authError.message); setBusy(false); }
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true);
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
    else { setSession(null); setMessage("تم تسجيل الخروج."); }
    setBusy(false);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#FAF8F5] px-4 py-10 text-[#1E1E1E]">
      <div className="mx-auto max-w-md">
        <a href="/" className="text-sm font-semibold text-[#8b681d]">← العودة إلى المتجر</a>
        <section className="mt-6 rounded-3xl border border-[#e8dfd2] bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[.25em] text-[#9B741C]">LEVEL WOMEN WEAR</p>
            <h1 className="mt-3 text-2xl font-bold">{session ? "حسابك" : "أهلاً بيكي"}</h1>
            <p className="mt-2 text-sm text-[#82776b]">{session ? "أنتِ مسجلة الدخول حاليًا." : "سجّلي الدخول أو أنشئي حسابًا جديدًا."}</p>
          </div>

          {!supabase && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">إعدادات تسجيل الدخول غير مكتملة. يرجى مراجعة إعدادات المتجر.</p>}

          {session ? (
            <div className="mt-7 space-y-4 text-center">
              <div className="rounded-2xl bg-[#F2ECE4] p-4">
                <p className="text-xs text-[#82776b]">البريد الإلكتروني</p>
                <p className="mt-1 break-all font-semibold" dir="ltr">{session.user.email}</p>
              </div>
              <button onClick={logout} disabled={busy} className="w-full rounded-full bg-[#1E1E1E] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "..." : "تسجيل الخروج"}</button>
            </div>
          ) : (
            <>
              <button onClick={googleLogin} disabled={!supabase || busy} className="mt-7 flex w-full items-center justify-center gap-3 rounded-full border border-[#ded4c8] bg-white px-5 py-3 font-semibold transition hover:bg-[#faf8f5] disabled:opacity-50">
                <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.9 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
                المتابعة باستخدام Google
              </button>

              <div className="my-6 flex items-center gap-3 text-xs text-[#a0968a]"><span className="h-px flex-1 bg-[#e8dfd2]"/><span>أو باستخدام البريد الإلكتروني</span><span className="h-px flex-1 bg-[#e8dfd2]"/></div>

              <div className="mb-5 grid grid-cols-2 rounded-full bg-[#F2ECE4] p-1">
                <button type="button" onClick={() => {setMode("signin");setError("");setMessage("");}} className={`rounded-full py-2 text-sm font-semibold ${mode === "signin" ? "bg-white shadow-sm" : "text-[#82776b]"}`}>تسجيل الدخول</button>
                <button type="button" onClick={() => {setMode("signup");setError("");setMessage("");}} className={`rounded-full py-2 text-sm font-semibold ${mode === "signup" ? "bg-white shadow-sm" : "text-[#82776b]"}`}>إنشاء حساب</button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <label className="block text-right text-sm font-medium">البريد الإلكتروني
                  <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-white p-3 text-left outline-none focus:border-[#B8860B]"/>
                </label>
                <label className="block text-right text-sm font-medium">كلمة المرور
                  <input type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" dir="ltr" className="mt-2 w-full rounded-xl border border-[#ded4c8] bg-white p-3 text-left outline-none focus:border-[#B8860B]"/>
                </label>
                <button type="submit" disabled={!supabase || busy} className="w-full rounded-full bg-[#1E1E1E] px-5 py-3 font-semibold text-white transition hover:bg-[#9B741C] disabled:opacity-50">{busy ? "..." : mode === "signup" ? "إنشاء الحساب" : "تسجيل الدخول"}</button>
              </form>
            </>
          )}

          {message && <p role="status" className="mt-5 rounded-xl bg-[#edf7ee] p-3 text-sm leading-7 text-[#276338]">{message}</p>}
          {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm leading-7 text-red-700">{error}</p>}
        </section>
      </div>
    </main>
  );
}
