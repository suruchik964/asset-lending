const variants = {
  primary: "bg-indigo-700 text-white hover:bg-indigo-800 focus:ring-indigo-600",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
};

export default function Button({ variant = "primary", className = "", type = "button", ...props }) {
  return <button type={type} className={`inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props} />;
}
