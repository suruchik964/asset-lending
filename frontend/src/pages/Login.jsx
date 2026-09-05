import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";

export default function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const { login } = useAuth(); const navigate = useNavigate();
  async function handleSubmit(e) { e.preventDefault(); setError(""); setLoading(true); try { const result = await login(email, password); navigate(result.role === "LIBRARIAN" ? "/dashboard" : "/my-loans", { replace: true }); } catch (err) { setError(err.response?.data?.error || "Login failed"); } finally { setLoading(false); } }
  return <AuthShell mode="login"><form onSubmit={handleSubmit} className="space-y-5">{error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<label className="block text-sm font-medium text-slate-700">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50" required /></label><label className="block text-sm font-medium text-slate-700">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50" required /></label><button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-700 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-800 disabled:opacity-50">{loading ? "Logging in..." : "Log in"}</button><p className="pt-1 text-center text-sm text-slate-500">No account? <Link to="/signup" className="font-semibold text-indigo-700 hover:text-indigo-900">Sign up</Link></p></form></AuthShell>;
}
