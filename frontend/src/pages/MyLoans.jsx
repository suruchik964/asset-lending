import { useState, useEffect } from "react";
import client from "../api/client";

export default function MyLoans() {
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    client.get("/loans/mine").then((res) => setLoans(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Loans</h1>
      <div className="bg-white rounded shadow divide-y">
        {loans.map((loan) => (
          <div key={loan.id} className="p-4">
            <p className="font-semibold">{loan.item.title}</p>
            <p className="text-sm text-gray-500">
              {loan.status}
              {loan.isOverdue && " · OVERDUE"}
              {loan.dueDate &&
                ` · due ${new Date(loan.dueDate).toLocaleDateString()}`}
            </p>
          </div>
        ))}
        {loans.length === 0 && (
          <p className="p-4 text-gray-500">You have no loans yet.</p>
        )}
      </div>
    </div>
  );
}
