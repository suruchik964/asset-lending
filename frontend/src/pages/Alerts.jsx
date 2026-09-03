import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    await client.post(`/alerts/${loanId}/dismiss`);
    loadAlerts();
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Overdue Alerts</h1>
      <div className="bg-white rounded shadow divide-y">
        {alerts.map((loan) => (
          <div key={loan.id} className="p-4 flex justify-between items-center">
            <div>
              <Link
                to={`/loans/${loan.id}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                {loan.item.title}
              </Link>
              <p className="text-sm text-gray-500">
                {loan.borrower.email} · due{" "}
                {new Date(loan.dueDate).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleDismiss(loan.id)}
              className="text-sm bg-gray-200 px-3 py-1 rounded"
            >
              Dismiss
            </button>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="p-4 text-gray-500">No active overdue alerts. 🎉</p>
        )}
      </div>
    </div>
  );
}

