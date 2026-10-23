import { describe, expect, it } from "vitest";
import { SEED, addComment, countByStatus, filterComments, parseComments, removeComment } from "@/lib/comments";

describe("parseComments", () => {
  it("returns null for missing storage so the seed is used", () => {
    expect(parseComments(null)).toBeNull();
  });

  it("ignores stored data that is not an array instead of crashing the page", () => {
    // Regression: the page did JSON.parse(saved) as Item[] and then called .filter on whatever came back.
    expect(parseComments('{"a":1}')).toBeNull();
    expect(parseComments("not json")).toBeNull();
  });

  it("drops malformed entries and keeps good ones", () => {
    const raw = JSON.stringify([SEED[0], { id: "x", title: "t", body: "b", status: "Deleted", createdAt: 1 }, null]);
    expect(parseComments(raw)).toEqual([SEED[0]]);
  });
});

describe("filterComments", () => {
  it("filters by status and searches title and body, case-insensitive and trimmed", () => {
    expect(filterComments(SEED, "Spam", "").map((c) => c.id)).toEqual(["c-02"]);
    expect(filterComments(SEED, "All", "  LOVE ").map((c) => c.id)).toEqual(["c-01"]);
    expect(filterComments(SEED, "Approved", "spam")).toEqual([]);
  });
});

describe("countByStatus", () => {
  it("counts each status and the total", () => {
    expect(countByStatus(SEED)).toEqual({ All: 2, Pending: 0, Approved: 1, Spam: 1 });
    expect(countByStatus([])).toEqual({ All: 0, Pending: 0, Approved: 0, Spam: 0 });
  });
});

describe("addComment / removeComment", () => {
  it("puts a trimmed new comment first and fills an empty body", () => {
    const next = addComment(SEED, { title: "  mia ", body: "  ", status: "Pending" }, 42);
    expect(next[0]).toEqual({ id: "c-42", title: "mia", body: "No note added.", status: "Pending", createdAt: 42 });
    expect(next).toHaveLength(3);
  });

  it("ignores a blank author", () => {
    expect(addComment(SEED, { title: "   ", body: "hi", status: "Approved" }, 1)).toBe(SEED);
  });

  it("removes by id only", () => {
    expect(removeComment(SEED, "c-01").map((c) => c.id)).toEqual(["c-02"]);
    expect(removeComment(SEED, "nope")).toHaveLength(2);
  });
});
