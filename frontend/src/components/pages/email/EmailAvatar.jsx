import React from "react";

// Small initials avatar used in the email list and reader.
export default function EmailAvatar({ name, color, size = 36 }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="shrink-0 rounded-full flex items-center justify-center font-medium text-white select-none"
      style={{ width: size, height: size, backgroundColor: color || "#0b57d0", fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
