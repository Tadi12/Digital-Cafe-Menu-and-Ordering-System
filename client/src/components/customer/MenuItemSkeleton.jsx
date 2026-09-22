import React from "react";

function MenuItemSkeleton() {
  return <div aria-hidden="true" className="flex animate-pulse gap-3 rounded-2xl border border-cafe-100 bg-white p-3 shadow-sm"><div className="h-24 w-24 shrink-0 rounded-xl bg-cafe-100" /><div className="flex min-w-0 flex-1 flex-col justify-between py-1"><div><div className="mb-2 h-4 w-3/4 rounded bg-cafe-100" /><div className="h-3 w-full rounded bg-cafe-50" /></div><div className="flex items-center justify-between"><div className="h-4 w-16 rounded bg-cafe-100" /><div className="h-8 w-8 rounded-full bg-cafe-100" /></div></div></div>;
}
export function MenuListSkeleton({ count = 4 }) { return <div className="space-y-3">{Array.from({ length: count }, (_, index) => <MenuItemSkeleton key={index} />)}</div>; }
export default MenuItemSkeleton;
