import React from "react";

const variants = {
  primary: "bg-cafe-800 text-white hover:bg-cafe-900 shadow-sm",
  secondary: "bg-cafe-100 text-cafe-800 hover:bg-cafe-200",
  outline: "border border-cafe-300 text-cafe-800 hover:bg-cafe-50",
  ghost: "text-cafe-700 hover:bg-cafe-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-5 py-3 text-base" };

export default function Button({ variant = "primary", size = "md", loading = false, fullWidth = false, className = "", children, disabled, ...props }) {
  return <button disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`} {...props}>
    {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}{children}
  </button>;
}
