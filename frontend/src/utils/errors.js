// Single source of truth for turning an API/axios error into a clear,
// human-readable message that explains WHY it happened (not just "failed").
//
// The backend is inconsistent: some endpoints return { error } and others
// return { message }. We check both, then the transport message, then a
// friendly status-based reason, then a fallback.

const OFFLINE_MSG =
  "You appear to be offline or the connection was interrupted. Check your connection and try again.";
const AUTH_MSG =
  "You are not signed in (or your session expired). Please sign in again.";
const PERMISSION_MSG = "You do not have permission to do this.";
const NOT_FOUND_MSG = "That item could not be found. It may have been removed or the link is broken.";
const SERVER_MSG = "Something went wrong on our side. Please try again in a moment.";

const isNetworkError = (err) => {
  if (!err) return false;
  // No response at all = we never reached the server.
  if (err.response) return false;
  const code = err.code || "";
  const msg = err.message || "";
  return (
    code === "ECONNABORTED" ||
    code === "ERR_NETWORK" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    msg === "Network Error" ||
    msg === "Request failed with status code 0"
  );
};

const serverMessage = (data) => {
  if (!data || typeof data !== "object") return "";
  for (const key of ["error", "message", "detail"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
  }
  return "";
};

export default function getApiError(err, fallback = "Something went wrong. Please try again.") {
  // 1) Connectivity problems — the most common real-world reason.
  if (isNetworkError(err)) return OFFLINE_MSG;

  const status = err?.response?.status;
  const serverMsg = serverMessage(err?.response?.data);

  // 2) Well-known statuses get a clear, plain-language reason.
  if (status === 401) return AUTH_MSG;
  if (status === 403) return PERMISSION_MSG;
  if (status === 404) return NOT_FOUND_MSG;
  if (status >= 500) return SERVER_MSG;

  // 3) The server gave a specific reason — prefer it (it is usually the real one).
  if (serverMsg) return serverMsg;

  // 4) A status we do not special-case — still clearer than a bare fallback.
  if (status && status >= 400) return `Request failed (${status}). Please try again.`;

  // 5) Some transport-level message worth surfacing.
  if (err?.message && err.message !== "Network Error") return err.message;

  // 6) Nothing useful — use the caller's fallback.
  return fallback;
}
