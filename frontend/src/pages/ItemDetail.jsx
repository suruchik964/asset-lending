import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [custodianEmail, setCustodianEmail] = useState("");
  const [error, setError] = useState("");

  function loadItem() {
    client.get(`/items/${id}`).then((res) => setItem(res.data));
  }

  useEffect(() => {
    loadItem();
  }, [id]);

  async function handleAddCustodian(e) {
    e.preventDefault();
    setError("");
    // We need a userId, but we only have an email from the form.
    // Simplest approach for now: ask the librarian to paste the user's ID directly.
    try {
      await client.post(`/items/${id}/custodians`, { userId: custodianEmail });
      setCustodianEmail("");
      loadItem();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add custodian");
    }
  }

  async function handleRemoveCustodian(userId) {
    await client.delete(`/items/${id}/custodians/${userId}`);
    loadItem();
  }

  if (!item) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl">
      <Link to="/items" className="text-sm text-blue-600">
        ← Back to catalogue
      </Link>
      <h1 className="text-2xl font-bold mt-2">{item.title}</h1>
      <p className="text-gray-500 mb-6">
        {item.category} · {item.code}
        {item.archived && " · Archived"}
      </p>

      {user.role === "LIBRARIAN" && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-semibold mb-3">Custodians</h2>
          <ul className="mb-3 text-sm">
            {item.custodians.map((c) => (
              <li
                key={c.userId}
                className="flex justify-between items-center py-1"
              >
                {c.user.email}
                <button
                  onClick={() => handleRemoveCustodian(c.userId)}
                  className="text-red-600 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
            {item.custodians.length === 0 && (
              <li className="text-gray-500">No custodians assigned</li>
            )}
          </ul>
          {error && (
            <div className="bg-red-50 text-red-700 p-2 rounded mb-2 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleAddCustodian} className="flex gap-2">
            <input
              placeholder="Librarian user ID"
              value={custodianEmail}
              onChange={(e) => setCustodianEmail(e.target.value)}
              className="border rounded px-3 py-1 text-sm flex-1"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Add
            </button>
          </form>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">Loan History</h2>
        <div className="divide-y">
          {item.loans.map((loan) => (
            <div key={loan.id} className="py-2 text-sm flex justify-between">
              <span>{loan.borrower.email}</span>
              <span className="text-gray-500">{loan.status}</span>
            </div>
          ))}
          {item.loans.length === 0 && (
            <p className="text-gray-500 text-sm">No loan history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
