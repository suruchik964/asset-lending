import { Boxes, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function AuthShell({ children, mode }) {
  const isLogin = mode === "login";
  return (
    <main className="auth-canvas min-h-screen p-4 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-indigo-950/10 lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <Link to="/" className="relative flex items-center gap-3 text-sm font-semibold"><span className="rounded-xl bg-white p-2 text-indigo-700"><Boxes size={19} /></span> Asset Lending</Link>
          <div className="relative my-auto max-w-md">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-indigo-100"><Sparkles size={14} /> A calmer way to manage shared assets</span>
            <h1 className="text-4xl font-semibold leading-tight">Every item has a home. Every handoff has a history.</h1>
            <p className="mt-5 text-base leading-7 text-slate-300">Keep your library visible, make requests effortless, and give your team a shared source of truth.</p>
          </div>
          <div className="relative space-y-3 text-sm text-slate-200">
            {["Live availability at a glance", "Clear custody and loan history", "Proactive return reminders"].map((line) => <p key={line} className="flex items-center gap-3"><span className="rounded-full bg-emerald-400/15 p-1 text-emerald-300"><Check size={13} /></span>{line}</p>)}
          </div>
        </section>
        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-12 flex items-center gap-2 font-semibold text-slate-900 lg:hidden"><span className="rounded-lg bg-indigo-700 p-2 text-white"><Boxes size={17} /></span> Asset Lending</Link>
            <div className="mb-7"><p className="mb-2 text-sm font-medium text-indigo-700">{isLogin ? "Welcome back" : "Get started"}</p><h2 className="text-3xl font-semibold tracking-tight text-slate-950">{isLogin ? "Sign in to your space" : "Create your workspace access"}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isLogin ? "Pick up right where your assets and loans left off." : "Join your team and start lending with confidence."}</p></div>
            {children}
            <p className="mt-7 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={14} /> Your asset activity stays organized and traceable.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
