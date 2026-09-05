import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import StatusBadge from "../components/StatusBadge";

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [items, setItems] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: "", status: "", itemId: "", borrowerId: "", sortBy: "requestedAt", sortDir: "desc" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [newLoan, setNewLoan] = useState({ itemId: "", borrowerId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadLoans() {
    setLoading(true);
    try {
      const response = await client.get("/loans", { params: { ...filters, page, pageSize: 10 } });
      setLoans(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) { setError(err.response?.data?.error || "Could not load loans"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadLoans(); }, [page, filters.status, filters.itemId, filters.borrowerId, filters.sortBy, filters.sortDir]);
  useEffect(() => {
    Promise.all([client.get("/items", { params: { includeArchived: "true" } }), client.get("/users")])
      .then(([itemResponse, userResponse]) => { setItems(itemResponse.data); setBorrowers(userResponse.data); })
      .catch(() => setError("Could not load loan filters"));
  }, []);

  function updateFilter(name, value) { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }
  function search(event) { event.preventDefault(); setPage(1); loadLoans(); }
  async function issue(loanId) {
    const days = window.prompt("Due in how many days?", "14");
    if (!days) return;
    const dueDate = new Date(Date.now() + Number(days) * 86400000);
    if (!Number.isFinite(dueDate.getTime())) return setError("Enter a valid number of days");
    try { await client.post(`/loans/${loanId}/issue`, { dueDate: dueDate.toISOString() }); loadLoans(); }
    catch (err) { setError(err.response?.data?.error || "Failed to issue loan"); }
  }
  async function transition(loanId, action) {
    try { await client.post(`/loans/${loanId}/${action}`, {}); loadLoans(); }
    catch (err) { setError(err.response?.data?.error || `Failed to ${action} loan`); }
  }
  async function createLoan(event) {
    event.preventDefault();
    try { await client.post("/loans", newLoan); setNewLoan({ itemId: "", borrowerId: "" }); loadLoans(); }
    catch (err) { setError(err.response?.data?.error || "Failed to create loan request"); }
  }
  async function bulkReturn() {
    try { const response = await client.post("/loans/bulk-return", { loanIds: selected }); setError(`Bulk return: ${response.data.succeeded} returned, ${response.data.failed} rejected.`); setSelected([]); loadLoans(); }
    catch (err) { setError(err.response?.data?.error || "Bulk return failed"); }
  }
  async function exportCsv() {
    try { const response = await client.get("/loans/export", { responseType: "blob" }); const url = URL.createObjectURL(response.data); const link = document.createElement("a"); link.href = url; link.download = "loans-on-loan.csv"; link.click(); URL.revokeObjectURL(url); }
    catch { setError("Failed to export CSV"); }
  }

  return <div className="max-w-6xl"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-sm font-semibold text-indigo-700">LENDING DESK</p><h1 className="text-3xl font-semibold tracking-tight">Loans</h1></div><div className="flex gap-2"><button onClick={exportCsv} className="rounded bg-slate-200 px-4 py-2 text-sm">Export CSV</button>{selected.length > 0 && <button onClick={bulkReturn} className="rounded bg-emerald-600 px-4 py-2 text-sm text-white">Return selected ({selected.length})</button>}</div></div>
    {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={createLoan} className="mb-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow"><select required value={newLoan.itemId} onChange={(e) => setNewLoan({ ...newLoan, itemId: e.target.value })} className="rounded border px-3 py-2 text-sm"><option value="">Item to request directly</option>{items.filter((item) => !item.archived).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select required value={newLoan.borrowerId} onChange={(e) => setNewLoan({ ...newLoan, borrowerId: e.target.value })} className="rounded border px-3 py-2 text-sm"><option value="">Borrower</option>{borrowers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button className="rounded bg-indigo-700 px-4 py-2 text-sm text-white">Create request</button></form>
    <form onSubmit={search} className="mb-4 grid gap-2 md:grid-cols-4"><input placeholder="Search item or borrower" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} className="rounded border px-3 py-2"/><select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)} className="rounded border px-3 py-2"><option value="">All statuses</option>{["REQUESTED", "ISSUED", "OVERDUE", "RETURNED", "LOST"].map((value) => <option key={value}>{value}</option>)}</select><select value={filters.itemId} onChange={(e) => updateFilter("itemId", e.target.value)} className="rounded border px-3 py-2"><option value="">All items</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select value={filters.borrowerId} onChange={(e) => updateFilter("borrowerId", e.target.value)} className="rounded border px-3 py-2"><option value="">All borrowers</option>{borrowers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><select value={filters.sortBy} onChange={(e) => updateFilter("sortBy", e.target.value)} className="rounded border px-3 py-2"><option value="requestedAt">Requested date</option><option value="dueDate">Due date</option><option value="status">Status</option></select><select value={filters.sortDir} onChange={(e) => updateFilter("sortDir", e.target.value)} className="rounded border px-3 py-2"><option value="desc">Newest / descending</option><option value="asc">Oldest / ascending</option></select><button className="rounded bg-indigo-700 px-4 py-2 text-white">Search</button></form>
    {loading ? <p>Loading…</p> : <div className="divide-y rounded bg-white shadow">{loans.map((loan) => <div key={loan.id} className="flex items-center justify-between gap-4 p-4"><div className="flex items-center gap-3">{loan.status === "ISSUED" && <input type="checkbox" checked={selected.includes(loan.id)} onChange={() => setSelected((ids) => ids.includes(loan.id) ? ids.filter((id) => id !== loan.id) : [...ids, loan.id])}/>}<div><Link to={`/loans/${loan.id}`} className="font-semibold text-indigo-700">{loan.item.title}</Link><p className="text-sm text-slate-500">{loan.borrower.name}{loan.dueDate && ` · due ${new Date(loan.dueDate).toLocaleDateString()}`}</p><StatusBadge status={loan.status} overdue={loan.isOverdue}/></div></div><div className="flex gap-2">{loan.status === "REQUESTED" && <button onClick={() => issue(loan.id)} className="rounded bg-indigo-700 px-3 py-1 text-sm text-white">Issue</button>}{loan.status === "ISSUED" && <><button onClick={() => transition(loan.id, "return")} className="rounded bg-emerald-600 px-3 py-1 text-sm text-white">Return</button><button onClick={() => transition(loan.id, "lost")} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Lost</button></>}</div></div>)}{loans.length === 0 && <p className="p-4 text-slate-500">No loans found.</p>}</div>}
    <div className="mt-4 flex items-center justify-between text-sm"><span>Page {pagination.page} of {pagination.totalPages || 1} ({pagination.total} total)</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Next</button></div></div>
  </div>;
}
