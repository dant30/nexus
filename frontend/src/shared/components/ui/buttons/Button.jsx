import React from "react";
import clsx from "clsx";

export function Button({ className, ...props }) {
  return (
    <button
      className={clsx("px-4 py-2 rounded bg-slate-700 text-white", className)}
      {...props}
    />
  );
}
