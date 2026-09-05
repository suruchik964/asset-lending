import { Inbox } from "lucide-react";
import Card from "./Card";

export default function EmptyState({ message, action }) {
  return <Card className="flex min-h-48 flex-col items-center justify-center text-center">
    <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500"><Inbox size={22} /></div>
    <p className="text-sm text-slate-600">{message}</p>
    {action && <div className="mt-4">{action}</div>}
  </Card>;
}
