const styles = {
  REQUESTED: "border-amber-600 bg-amber-100 text-amber-800",
  ISSUED: "border-indigo-700 bg-indigo-100 text-indigo-800",
  OVERDUE: "border-red-600 bg-red-100 text-red-800",
  RETURNED: "border-emerald-600 bg-emerald-100 text-emerald-800",
  LOST: "border-slate-600 bg-slate-200 text-slate-700",
  ARCHIVED: "border-slate-600 bg-slate-200 text-slate-700",
};

export default function StatusBadge({ status, overdue = false }) {
  const label = overdue ? "OVERDUE" : status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${styles[label] || styles.LOST}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
