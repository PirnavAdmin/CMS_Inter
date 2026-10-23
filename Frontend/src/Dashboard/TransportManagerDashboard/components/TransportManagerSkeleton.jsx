import React from "react";

export default function TransportManagerSkeleton({ rows = 3, height = "1.5rem" }) {
  return (
    <div className="tm-skeleton-group">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="tm-skeleton"
          style={{
            height,
            marginBottom: i === rows - 1 ? 0 : "0.75rem",
            width: i === 0 ? "100%" : i === rows - 1 ? "70%" : "85%",
          }}
        />
      ))}
    </div>
  );
}
