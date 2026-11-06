// One place to show user-facing messages. Everything the app "says" to a
// person goes through here so the look and wording stay consistent.
//
//   - Errors / info / warnings  -> small non-blocking toasts (auto-dismiss)
//   - Confirmations / important -> SweetAlert modals (branded, readable)
//
// Errors always explain WHY they happened (see utils/errors.js).

import toast from "react-hot-toast";
import Swal from "sweetalert2";
import getApiError from "./errors";

// ---- Brand colors (match the app's Tailwind brand/slate palette) ----
const COLORS = {
  success: "#059669", // emerald-600
  error: "#dc2626", // red-600
  warning: "#d97706", // amber-600
  info: "#2563eb", // blue-600
};

// Consistent SweetAlert look for every modal in the app.
export const swalTheme = {
  customClass: {
    popup: "rounded-2xl shadow-2xl !bg-white",
    title: "text-slate-900",
    htmlContainer: "text-slate-600",
  },
  confirmButtonColor: COLORS.success,
  cancelButtonColor: "#64748b", // slate-500
  timerProgressBar: true,
};

// ===================================================================
// Toasts — for errors, info, warnings, and quick successes.
// ===================================================================

// Show an API/axios error as a toast. `fallback` is a short human label
// describing the action that failed (e.g. "Failed to save product").
export function apiError(err, fallback = "Something went wrong. Please try again.") {
  toast.error(getApiError(err, fallback), {
    icon: "⚠️",
    duration: 5000,
  });
}

export function showSuccess(message, duration = 3000) {
  toast.success(message, { duration });
}

export function showError(message, duration = 5000) {
  toast.error(message, { icon: "⚠️", duration });
}

export function showWarning(message, duration = 5000) {
  toast(message, { icon: "⚠️", duration });
}

export function showInfo(message, duration = 4000) {
  toast(message, { icon: "ℹ️", duration });
}

// ===================================================================
// Modals — for confirmations and anything important enough to block.
// ===================================================================

// A yes/no confirmation. Returns { isConfirmed, value } (Swal promise).
export function confirm({ title, text, confirmText = "Yes", cancelText = "Cancel", danger = false } = {}) {
  return Swal.fire({
    ...swalTheme,
    title,
    html: text || undefined,
    icon: danger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? COLORS.error : COLORS.info,
    preConfirm: undefined,
  });
}

// An input dialog (text). Returns { isConfirmed, value }.
export function promptText({ title, text, label, placeholder = "", input = "text" } = {}) {
  return Swal.fire({
    ...swalTheme,
    title,
    html: text || undefined,
    input,
    inputValue: placeholder || "",
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: "OK",
    cancelButtonText: "Cancel",
    confirmButtonColor: COLORS.info,
    inputValidator: label
      ? (v) => {
          if (!v || !String(v).trim()) return `${label} is required`;
          return null;
        }
      : undefined,
  });
}

// A simple result modal (informational, auto-dismiss).
export function showResult({ icon = "success", title, text, timer = 1800 } = {}) {
  Swal.fire({
    ...swalTheme,
    icon,
    title,
    html: text || undefined,
    showConfirmButton: false,
    timer,
  });
}
