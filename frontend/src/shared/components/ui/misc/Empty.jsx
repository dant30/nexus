import React from "react";

export function Empty({ message = "No data" }) {
  return <div className="text-slate-400">{message}</div>;
}
