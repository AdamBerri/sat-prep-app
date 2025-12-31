// Simple visitor ID management for anonymous users
// This allows users to take the exam without authentication

const VISITOR_ID_KEY = "sat_visitor_id";

export function getVisitorId(): string {
  if (typeof window === "undefined") {
    // Server-side, return a placeholder
    return "server";
  }

  let visitorId = localStorage.getItem(VISITOR_ID_KEY);

  if (!visitorId) {
    // Generate a new visitor ID
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }

  return visitorId;
}

export function clearVisitorId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(VISITOR_ID_KEY);
  }
}
