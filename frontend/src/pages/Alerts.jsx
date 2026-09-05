import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import Button from "../components/Button";
import Card from "../components/Card";
import Skeleton from "../components/Skeleton";
import StatusBadge from "../components/StatusBadge";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState(null);
  const [error, setError] = useState("");

  function loadAlerts() {
    setLoading(true);
    client
      .get("/alerts")
      .then((res) => setAlerts(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  async function handleDismiss(loanId) {
    setDismissingId(loanId);
    setError("");
    try {
      await client.post(`/alerts/${loanId}/dismiss`);
      window.dispatchEvent(new Event("alerts-changed"));
      loadAlerts();
    } catch (err) {
      setError(err.response?.data?.error || "Could not dismiss this alert");
    } finally {
      setDismissingId(null);
    }
  }

  if (loading) return <Skeleton />;

  return (
    <div className="max-w-5xl"><h1 className="mb-6 text-2xl font-bold">Overdue Alerts</h1>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Card className="divide-y divide-slate-100 p-0">
        {alerts.map((loan) => (
          <div key={loan.id} className="flex items-center justify-between gap-4 border-l-4 border-red-500 bg-red-50/40 p-5">
            <div>
              <Link
                to={`/loans/${loan.id}`}
                className="text-sm font-semibold text-indigo-700 hover:underline"
              >
                {loan.item.title}
              </Link>
              <p className="text-sm text-gray-500">
                {loan.borrower.name} · due{" "}
                {new Date(loan.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3"><StatusBadge status="ISSUED" overdue /><Button variant="secondary" disabled={dismissingId === loan.id} onClick={() => handleDismiss(loan.id)}>{dismissingId === loan.id ? "Dismissing…" : "Dismiss"}</Button></div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="p-4 text-gray-500">No active overdue alerts. 🎉</p>
        )}
      </Card>
    </div>
  );
}

