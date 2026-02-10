import React from "react";

export function Table({ children, className = "" }) {
  return <table className={`w-full text-left border-separate border-spacing-y-2 ${className}`}>{children}</table>;
}
