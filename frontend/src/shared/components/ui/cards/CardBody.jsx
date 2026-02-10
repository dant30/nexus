import React from "react";

export function CardBody({ children, className = "" }) {
  return <div className={`text-sm text-white/90 ${className}`}>{children}</div>;
}
