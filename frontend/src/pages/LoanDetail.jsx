import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../api/client";

export default function LoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [note, setNote] = useState("");

  function loadLoan() {
    client.get(`/loans/${id}`).then((res) => setLoan(res.data));
  }

  useEffect(() => {
    loadLoan();
  }, [id]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    await client.post(`/loans/${id}/notes`, { note });
    setNote("");
    loadLoan();
  }

  if (!loan) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl">
      <Link to="/loans" className="text-sm text-blue-600">
        ← Back to loans
      </Link>
      <h1 className="text-2xl font-bold mt-2">{loan.item.title}</h1>
      <p className="text-gray-500 mb-6">
        {loan.borrower.name} · {loan.status}
        {loan.isOverdue && " · OVERDUE"}
      </p>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Timeline</h2>
        <div className="space-y-3">
          {loan.events.filter((ev) => ev.type !== "NOTE").map((ev) => (
            <div
              key={ev.id}
              className="text-sm border-l-2 border-blue-200 pl-3"
            >
              <span className="font-medium">{ev.type}</span>
              <span className="text-gray-500">
                {" "}
                by {ev.actor.name} · {new Date(ev.createdAt).toLocaleString()}
              </span>
              {ev.note && <p className="text-gray-600 mt-1">{ev.note}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Notes</h2>
        <div className="space-y-3">
          {loan.events.filter((ev) => ev.type === "NOTE").map((ev) => (
            <div key={ev.id} className="text-sm border-l-2 border-amber-200 pl-3">
              <p>{ev.note}</p>
              <p className="text-gray-500 mt-1">by {ev.actor.name} · {new Date(ev.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!loan.events.some((ev) => ev.type === "NOTE") && <p className="text-sm text-gray-500">No notes yet.</p>}
        </div>
      </div>

      <form
        onSubmit={handleAddNote}
        className="bg-white p-4 rounded shadow flex gap-2"
      >
        <input
          placeholder="Add a note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Note
        </button>
      </form>
    </div>
  );
}
