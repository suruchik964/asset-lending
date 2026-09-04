import { Link, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Layout() {
  const { user, logout } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (user?.role === "LIBRARIAN") {
      client
        .get("/alerts/count")
        .then((res) => setAlertCount(res.data.count))
        .catch(() => {});
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-lg">
            Asset Lending
          </Link>
          <Link to="/items" className="text-gray-700 hover:text-blue-600">
            Catalogue
          </Link>
          {user?.role === "LIBRARIAN" && (
            <>
              <Link to="/loans" className="text-gray-700 hover:text-blue-600">
                Loans
              </Link>
              <Link
                to="/my-items"
                className="text-gray-700 hover:text-blue-600"
              >
                My Items
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600"
              >
                Dashboard
              </Link>
              <Link
                to="/alerts"
                className="text-gray-700 hover:text-blue-600 relative"
              >
                Alerts
                {alertCount > 0 && (
                  <span className="absolute -top-2 -right-4 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5">
                    {alertCount}
                  </span>
                )}
              </Link>
            </>
          )}
          {user?.role === "MEMBER" && (
            <Link to="/my-loans" className="text-gray-700 hover:text-blue-600">
              My Loans
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {user?.name || user?.email} ({user?.role})
          </span>
          <button
            onClick={logout}
            className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
