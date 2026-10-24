// Single place to turn an axios error into a human-readable message.
// The backend is inconsistent: some endpoints return { error } and others
// return { message }. Check both, then the transport message, then a fallback.
export default function getApiError(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  if (data && typeof data === "object") {
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (typeof data.message === "string" && data.message.trim()) return data.message;
  }
  if (err?.message && err.message !== "Network Error" && err.message !== "Request failed with status code 0") {
    return err.message;
  }
  return fallback;
}
