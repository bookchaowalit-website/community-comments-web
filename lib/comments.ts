// Comment queue data and pure logic, shared by the page and the MCP route. Browser-local demo data only.

export type Status = "Pending" | "Approved" | "Spam";
export type Comment = { id: string; title: string; body: string; status: Status; createdAt: number };
export type Filter = "All" | Status;

export const STORAGE_KEY = "comments-v1";
export const STATUSES: Status[] = ["Pending", "Approved", "Spam"];
export const FILTERS: Filter[] = ["All", ...STATUSES];

export const SEED: Comment[] = [
  { id: "c-01", title: "alice", body: "Love this demo!", status: "Approved", createdAt: 1710000000000 },
  { id: "c-02", title: "bob", body: "spam link", status: "Spam", createdAt: 1710086400000 },
];

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

function isComment(value: unknown): value is Comment {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.title === "string" &&
    typeof c.body === "string" &&
    isStatus(c.status) &&
    typeof c.createdAt === "number" &&
    Number.isFinite(c.createdAt)
  );
}

// Stored data is untrusted: anything that is not an array of well-formed comments is ignored (null).
export function parseComments(raw: string | null): Comment[] | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data.filter(isComment);
  } catch {
    return null;
  }
}

export function filterComments(items: Comment[], filter: Filter, query: string): Comment[] {
  const needle = query.trim().toLowerCase();
  return items.filter(
    (item) => (filter === "All" || item.status === filter) && `${item.title} ${item.body}`.toLowerCase().includes(needle),
  );
}

export function countByStatus(items: Comment[]): Record<Filter, number> {
  const counts: Record<Filter, number> = { All: items.length, Pending: 0, Approved: 0, Spam: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

export type Draft = { title: string; body: string; status: Status };

// Returns the list with the new comment first, or the same list when the author/title is blank.
export function addComment(items: Comment[], draft: Draft, now: number): Comment[] {
  const title = draft.title.trim();
  if (!title) return items;
  return [{ id: `c-${now}`, title, body: draft.body.trim() || "No note added.", status: draft.status, createdAt: now }, ...items];
}

export function removeComment(items: Comment[], id: string): Comment[] {
  return items.filter((item) => item.id !== id);
}
