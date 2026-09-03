import { useState, useEffect } from "react";
import client from "../api/client";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get("/dashboard").then((res) => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  const maxCount = Math.max(...data.returnsPerWeek.map((w) => w.count), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Items Out" value={data.headline.itemsOut} />
        <StatCard
          label="Overdue"
          value={data.headline.itemsOverdue}
          color="text-red-600"
        />
        <StatCard
          label="Returned This Week"
          value={data.headline.returnedThisWeek}
        />
        <StatCard label="Total Items" value={data.headline.totalItems} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-3">Loans by Status</h2>
          <div className="space-y-2">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-sm">
                <span>{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-3">Open Loans by Custodian</h2>
          <div className="space-y-2">
            {data.byCustodian.map((c) => (
              <div key={c.userId} className="flex justify-between text-sm">
                <span>{c.email}</span>
                <span className="font-medium">{c.openLoans}</span>
              </div>
            ))}
            {data.byCustodian.length === 0 && (
              <p className="text-sm text-gray-500">
                No custodians assigned yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <h2 className="font-semibold mb-3">
          Items Returned per Week (last 8 weeks)
        </h2>
        <div className="flex items-end gap-2 h-32">
          {data.returnsPerWeek.map((w) => (
            <div
              key={w.weekStart}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="bg-blue-500 w-full rounded-t"
                style={{
                  height: `${(w.count / maxCount) * 100}%`,
                  minHeight: w.count > 0 ? "4px" : "0",
                }}
              />
              <span className="text-xs text-gray-500">{w.count}</span>
              <span className="text-xs text-gray-400">
                {w.weekStart.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-gray-900" }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
