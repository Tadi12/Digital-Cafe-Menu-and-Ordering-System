import React from "react";

const tones = {
  pending: "bg-amber-100 text-amber-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-emerald-100 text-emerald-800",
  completed: "bg-cafe-100 text-cafe-700",
  cancelled: "bg-red-100 text-red-700",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-700",
  neutral: "bg-cafe-100 text-cafe-700",
};

export default function Badge({ status, tone, className = "", children }) {
  // Normalize to lowercase so "Ready", "ready", and "READY" all resolve
  const key = String(status || tone || "neutral").toLowerCase();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${tones[key] || tones.neutral} ${className}`}
    >
      {children ?? status}
    </span>
  );
}
