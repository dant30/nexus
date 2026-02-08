import React from "react";

export function ConfirmDialog({ message = "Are you sure?" }) {
  return <div className="text-white">{message}</div>;
}
