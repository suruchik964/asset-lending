import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import Button from "../components/Button";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";

export default function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [importing, setImporting] = useState(false);

  function loadItems(includeArchived = showArchived) {
    setLoading(true);
    setError("");
    client
      .get("/items", { params: includeArchived ? { includeArchived: "true" } : {} })
      .then((res) => setItems(res.data))
      .catch((err) => {
        setItems([]);
        setError(err.response?.data?.error || "Could not load the catalogue. Please sign in again and retry.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, [showArchived]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/items", { title, category, code });
      setTitle("");
      setCategory("");
      setCode("");
      setShowForm(false);
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create item");
    }
  }

  async function handleArchive(id, archived) {
    try {
      const action = archived ? "restore" : "archive";
      await client.patch(`/items/${id}/${action}`);
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update item status");
    }
  }

  async function handleRequest(itemId) {
    try {
      await client.post("/loans", { itemId });
      alert("Loan requested!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to request loan");
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setImportReport(null);
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await client.post("/items/import", formData);
      setImportReport(response.data);
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to import CSV");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  if (loading) return <Skeleton />;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mb-1 text-sm font-semibold text-indigo-700">YOUR COLLECTION</p><h1 className="text-3xl font-semibold tracking-tight">Catalogue</h1><p className="mt-1 text-sm text-slate-500">Browse available assets, request a loan, or keep your collection up to date.</p></div>
        <div className="flex items-center gap-3">
          {user.role === "LIBRARIAN" && <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived</label>}
          {user.role === "LIBRARIAN" && (
            <><label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{importing ? "Importing..." : "Import CSV"}<input type="file" accept=".csv,text/csv" onChange={handleImport} disabled={importing} className="hidden" /></label><Button onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Add Item"}</Button></>
          )}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {error && (
            <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-sm">
              {error}
            </div>
          )}
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Code (unique)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <Button type="submit">Create item</Button>
        </form>
      )}

      {error && !showForm && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4 text-sm" role="alert">{error}</div>
      )}

      {importReport && <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold">Import complete: {importReport.succeeded} imported, {importReport.failed} failed.</p><ul className="mt-2 list-disc pl-5 text-slate-600">{importReport.report.map((row) => <li key={row.row} className={row.success ? "text-emerald-700" : "text-red-700"}>Row {row.row}: {row.success ? "imported" : row.error}</li>)}</ul></div>}

      {items.length === 0 ? <EmptyState message="No catalogue items to show." /> : <Card className="divide-y divide-slate-100 p-0">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 p-5 transition hover:bg-slate-50/80">
            <div>
              <Link
                to={`/items/${item.id}`}
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
              >
                {item.title}
              </Link>
              <p className="text-sm text-gray-500">
                {item.category} · {item.code}
                {item.archived && " · Archived"}
              </p>
            </div>
            <div className="flex gap-2">
              {user.role === "MEMBER" && !item.archived && (
                <button
                  onClick={() => handleRequest(item.id)}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Request
                </button>
              )}
              {user.role === "LIBRARIAN" && (
                <><Link to={`/items/${item.id}`} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">Manage custodians</Link><button onClick={() => handleArchive(item.id, item.archived)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-300">{item.archived ? "Restore" : "Archive"}</button></>
              )}
            </div>
          </div>
        ))}
      </Card>}
    </div>
  );
}
