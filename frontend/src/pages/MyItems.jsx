import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function MyItems() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    client.get("/items/mine").then((res) => setItems(res.data));
  }, []);

  return (
    <div>
      <div className="mb-6"><p className="mb-1 text-sm font-semibold text-indigo-700">CUSTODIAN VIEW</p><h1 className="text-3xl font-semibold tracking-tight">My items</h1><p className="mt-1 text-sm text-slate-500">Assets you help keep ready, accounted for, and lending smoothly.</p></div>
      <div className="bg-white rounded shadow divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4">
            <Link
              to={`/items/${item.id}`}
              className="font-semibold text-blue-600 hover:underline"
            >
              {item.title}
            </Link>
            {item.archived && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">Archived</span>}
            <p className="text-sm text-gray-500">
              {item.category} · {item.code}
            </p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="p-4 text-gray-500">
            You aren't a custodian of any items yet.
          </p>
        )}
      </div>
    </div>
  );
}
