import React from "react";

export function Toast({ message }) {
  return <div className="bg-slate-700 text-white px-3 py-2 rounded shadow-sm">{message}</div>;
}
