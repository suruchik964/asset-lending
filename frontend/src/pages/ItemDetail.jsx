import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [custodianId, setCustodianId] = useState("");
  const [librarians, setLibrarians] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", code: "" });

  function loadItem() {
    client.get(`/items/${id}`).then((res) => {
      setItem(res.data);
      setForm({ title: res.data.title, category: res.data.category, code: res.data.code });
    }).catch((err) => setError(err.response?.data?.error || "Failed to load item"));
  }

  useEffect(() => {
    loadItem();
    if (user.role === "LIBRARIAN") client.get("/users", { params: { role: "LIBRARIAN" } }).then((res) => setLibrarians(res.data)).catch(() => setError("Failed to load librarians"));
  }, [id]);

  async function handleAddCustodian(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post(`/items/${id}/custodians`, { userId: custodianId });
      setCustodianId("");
      loadItem();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add custodian");
    }
  }

  async function handleRemoveCustodian(userId) {
    try {
      await client.delete(`/items/${id}/custodians/${userId}`);
      loadItem();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to remove custodian");
    }
  }

  async function handleSaveItem(e) {
    e.preventDefault();
    setError("");
    try {
      await client.patch(`/items/${id}`, form);
      setEditing(false);
      loadItem();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update item");
    }
  }

  async function handleArchive() {
    setError("");
    try {
      await client.patch(`/items/${id}/${item.archived ? "restore" : "archive"}`);
      loadItem();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update item status");
    }
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

      {error && <div className="bg-red-50 text-red-700 p-2 rounded mb-4 text-sm" role="alert">{error}</div>}

      {user.role === "LIBRARIAN" && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Item details</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditing((value) => !value)} className="text-sm bg-gray-200 px-3 py-1 rounded">{editing ? "Cancel" : "Edit"}</button>
              <button onClick={handleArchive} className="text-sm bg-gray-200 px-3 py-1 rounded">{item.archived ? "Restore" : "Archive"}</button>
            </div>
          </div>
          {editing && <form onSubmit={handleSaveItem} className="grid gap-3 sm:grid-cols-3">
            {[["title", "Title"], ["category", "Category"], ["code", "Code"]].map(([field, label]) => <label key={field} className="text-sm">{label}<input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" required /></label>)}
            <button type="submit" className="sm:col-span-3 bg-blue-600 text-white px-4 py-2 rounded justify-self-start">Save changes</button>
          </form>}
        </div>
      )}

      {user.role === "LIBRARIAN" && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-semibold mb-3">Custodians</h2>
          <ul className="mb-3 text-sm">
            {item.custodians.map((c) => (
              <li
                key={c.userId}
                className="flex justify-between items-center py-1"
              >
                <span>{c.user.name} <span className="text-gray-500">({c.user.email})</span></span>
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
          <form onSubmit={handleAddCustodian} className="flex gap-2">
            <select
              value={custodianId}
              onChange={(e) => setCustodianId(e.target.value)}
              className="border rounded px-3 py-1 text-sm flex-1"
              required
            >
              <option value="">Select a librarian</option>
              {librarians.map((librarian) => <option key={librarian.id} value={librarian.id}>{librarian.name} ({librarian.email})</option>)}
            </select>
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
              <span>{loan.borrower.name}</span>
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
