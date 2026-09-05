import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, Boxes, ChartNoAxesCombined, ClipboardList, LogOut, PackageCheck, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Layout() {
  const { user, logout } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (user?.role !== "LIBRARIAN") return undefined;
    const refreshAlertCount = () => {
      client.get("/alerts/count").then((res) => setAlertCount(res.data.count)).catch(() => {});
    };
    refreshAlertCount();
    window.addEventListener("alerts-changed", refreshAlertCount);
    return () => window.removeEventListener("alerts-changed", refreshAlertCount);
  }, [user]);

  const links = [{ to: "/items", label: "Catalogue", icon: Boxes }];
  if (user?.role === "LIBRARIAN") links.push({ to: "/loans", label: "Loans", icon: ClipboardList }, { to: "/my-items", label: "My Items", icon: Users }, { to: "/dashboard", label: "Dashboard", icon: ChartNoAxesCombined }, { to: "/alerts", label: "Alerts", icon: Bell, badge: alertCount });
  if (user?.role === "MEMBER") links.push({ to: "/my-loans", label: "My Loans", icon: PackageCheck });

  return <div className="min-h-screen bg-[#f7f8fc] text-slate-900 md:flex">
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-slate-950 text-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 px-6 py-7"><div className="rounded-xl bg-indigo-500 p-2 text-white"><Boxes size={20} /></div><span className="font-semibold tracking-tight">Asset Lending</span></div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {links.map(({ to, label, icon: Icon, badge }) => <NavLink key={to} to={to} className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-indigo-500 text-white shadow-lg shadow-indigo-950/20" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}><Icon size={18} />{label}{badge > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">{badge}</span>}</NavLink>)}
      </nav>
      <div className="mt-auto hidden border-t border-white/10 p-4 md:block"><p className="truncate text-sm font-medium">{user?.name || user?.email}</p><p className="mb-3 text-xs uppercase tracking-wide text-slate-500">{user?.role}</p><button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={16} />Log out</button></div>
    </aside>
    <main className="min-w-0 flex-1 p-5 md:p-8"><Outlet /></main>
  </div>;
}
