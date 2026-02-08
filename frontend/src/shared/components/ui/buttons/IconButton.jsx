import React from "react";
import clsx from "clsx";

export function IconButton({ className, ...props }) {
  return (
    <button
      className={clsx("p-2 rounded bg-slate-700 text-white", className)}
      {...props}
    />
  );
}
