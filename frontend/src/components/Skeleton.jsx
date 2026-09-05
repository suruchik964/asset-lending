export default function Skeleton({ rows = 3, cards = false }) {
  return <div className={cards ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "space-y-3"}>
    {Array.from({ length: rows }).map((_, index) => <div key={index} className={`animate-pulse rounded-xl border border-slate-200 bg-white p-5 ${cards ? "h-28" : "h-16"}`}><div className="h-3 w-2/5 rounded bg-slate-200" /><div className="mt-3 h-3 w-3/5 rounded bg-slate-100" /></div>)}
  </div>;
}
