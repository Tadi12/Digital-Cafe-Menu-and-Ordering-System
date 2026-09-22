import React from "react";
export default function Input({ label, error, icon: Icon, className = "", id, ...props }) {
  const inputId = id || props.name;
  return <div className="w-full">{label && <label htmlFor={inputId} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-cafe-800">{label}</label>}<div className="relative">{Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cafe-400" />}<input id={inputId} aria-invalid={!!error} className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-cafe-900 outline-none transition focus:border-cafe-600 focus:ring-2 focus:ring-cafe-200 ${Icon ? "pl-10" : ""} ${error ? "border-red-500" : "border-cafe-200"} ${className}`} {...props} /></div>{error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}</div>;
}
