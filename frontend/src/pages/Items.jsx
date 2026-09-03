import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

export default function Items() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function loadItems() {
    setLoading(true);
    client
      .get("/items")
      .then((res) => setItems(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadItems();
  }, []);

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
    const action = archived ? "restore" : "archive";
    await client.patch(`/items/${id}/${action}`);
    loadItems();
  }

  async function handleRequest(itemId) {
    try {
      await client.post("/loans", { itemId });
      alert("Loan requested!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to request loan");
    }
  }

  if (loading) return <p>Loading catalogue...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Catalogue</h1>
        {user.role === "LIBRARIAN" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {showForm ? "Cancel" : "+ Add Item"}
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-4 rounded shadow mb-6 max-w-md"
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
            className="w-full border rounded px-3 py-2 mb-3"
            required
          />
          <input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3"
            required
          />
          <input
            placeholder="Code (unique)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3"
            required
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Create
          </button>
        </form>
      )}

      <div className="bg-white rounded shadow divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex justify-between items-center">
            <div>
              <Link
                to={`/items/${item.id}`}
                className="font-semibold text-blue-600 hover:underline"
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
                <button
                  onClick={() => handleArchive(item.id, item.archived)}
                  className="text-sm bg-gray-200 px-3 py-1 rounded"
                >
                  {item.archived ? "Restore" : "Archive"}
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-4 text-gray-500">No items yet.</p>
        )}
      </div>
    </div>
  );
}
