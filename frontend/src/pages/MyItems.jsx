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
      <h1 className="text-2xl font-bold mb-4">My Items (I'm Custodian)</h1>
      <div className="bg-white rounded shadow divide-y">
        {items.map((item) => (
          <div key={item.id} className="p-4">
            <Link
              to={`/items/${item.id}`}
              className="font-semibold text-blue-600 hover:underline"
            >
              {item.title}
            </Link>
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
