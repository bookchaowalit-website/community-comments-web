// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SEED, STORAGE_KEY } from "@/lib/comments";
import { resetStoredCache } from "@/lib/use-stored-state";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const press = (el: Element, detail = 0) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  localStorage.clear();
  resetStoredCache();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("composer", () => {
  it("opens focused, keeps Add disabled without an author, adds on top and returns focus", () => {
    press(button("New comment"));
    expect(document.activeElement).toBe($(".as-composer input"));
    expect(button("Add", $(".as-composer")!).disabled).toBe(true);
    expect(host.textContent).toContain("Add an author to enable Add.");
    type($<HTMLInputElement>(".as-composer input")!, "mia");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "Nice write-up");
    press(button("Approved", $(".as-composer")!));
    press(button("Add", $(".as-composer")!));
    expect(rows()[0]).toBe("mia");
    expect(document.activeElement?.textContent).toContain("New comment");
    expect(JSON.parse(localStorage.getItem("comments-v1")!)[0]).toMatchObject({ title: "mia", status: "Approved" });
  });

  it("adding from another list switches to the new comment's list; Cancel adds nothing", () => {
    press(button("Spam", $(".as-side")!));
    press(button("New comment"));
    type($<HTMLInputElement>(".as-composer input")!, "zoe");
    press(button("Add", $(".as-composer")!));
    expect($("h1")!.textContent).toBe("Pending");
    expect(host.textContent).toContain("No note added.");
    press(button("New comment"));
    type($<HTMLInputElement>(".as-composer input")!, "never");
    press(button("Cancel"));
    expect(rows()).not.toContain("never");
  });
});

describe("lists and search", () => {
  it("filters by list, searches, and shows distinct empty states with a way back", () => {
    press(button("Approved", $(".as-side")!));
    expect(rows()).toEqual(["alice"]);
    press(button("Pending", $(".as-side")!));
    expect(host.textContent).toContain("Nothing marked Pending yet");
    press(button("All comments", $(".as-side")!));
    type($<HTMLInputElement>(".as-search input")!, "zzz");
    expect(host.textContent).toContain("Nothing matches");
    press(button("Clear search"));
    expect(document.activeElement).toBe($(".as-search input"));
    expect(rows()).toEqual(["alice", "bob"]);
  });
});

describe("remove and undo", () => {
  it("removes with a toast; Undo puts the comment back in place and focuses it", () => {
    press($('[aria-label="Remove the comment by alice"]')!);
    expect(rows()).toEqual(["bob"]);
    expect(document.activeElement).toBe(button("Undo"));
    press(button("Undo"));
    expect(rows()).toEqual(["alice", "bob"]);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Remove the comment by alice");
  });

  it("Escape dismisses the toast and focus moves to the next row; the timer closes it too", () => {
    press($('[aria-label="Remove the comment by alice"]')!);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Remove the comment by bob");
    vi.useFakeTimers();
    press($('[aria-label="Remove the comment by bob"]')!, 1);
    act(() => { vi.advanceTimersByTime(6100); });
    expect($(".as-toast")).toBeNull();
    expect(host.textContent).toContain("The queue is empty");
  });

  it("a comment with a line break gets Show more", () => {
    press(button("New comment"));
    type($<HTMLInputElement>(".as-composer input")!, "kai");
    type($<HTMLTextAreaElement>(".as-composer textarea")!, "one\ntwo");
    press(button("Add", $(".as-composer")!));
    press(button("Show more"));
    expect(button("Show less").getAttribute("aria-expanded")).toBe("true");
  });
});

describe("batch Undo", () => {
  afterEach(() => { vi.useRealTimers(); });
  // Three copies of the samples, so there are enough rows to remove two.
  beforeEach(() => {
    act(() => root.unmount());
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3].flatMap((n) => SEED.map((item) => ({ ...item, id: `${item.id}-${n}` })))));
    resetStoredCache();
    root = createRoot(host);
    act(() => root.render(<Home />));
  });
  // detail 0 = keyboard (Enter/Space) click, 1 = pointer click.
  const click = (el: Element, detail: number) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
  const shownRows = () => [...host.querySelectorAll<HTMLElement>(".as-row[data-comment]")];
  const rowIds = () => shownRows().map((row) => row.getAttribute("data-comment"));
  const removeButton = (i: number) => shownRows()[i].querySelector<HTMLButtonElement>(".as-danger")!;
  const undoButton = () => host.querySelector<HTMLButtonElement>(".as-toast button")!;

  it("consecutive removes restore together with one Undo", () => {
    vi.useFakeTimers();
    const before = rowIds();
    expect(before.length).toBeGreaterThanOrEqual(3);
    click(removeButton(1), 1);
    act(() => { vi.advanceTimersByTime(4000); });
    click(removeButton(0), 1);
    expect(rowIds()).toEqual(before.slice(2));
    expect(host.querySelector(".as-toast span")!.textContent).toBe("Removed 2 comments");
    expect(undoButton().getAttribute("aria-label")).toBe("Undo remove of 2 comments");
    // The second removal restarted the 6 s window: 4 s later it is still open.
    act(() => { vi.advanceTimersByTime(4000); });
    click(undoButton(), 1);
    expect(rowIds()).toEqual(before);
    expect(host.querySelector(".as-toast")).toBeNull();
    expect(host.querySelector(".as-sr[role=status]")!.textContent).toBe("Restored 2 comments.");
  });

  it("keyboard remove focuses Undo", () => {
    const before = rowIds();
    click(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    click(removeButton(0), 0);
    expect(document.activeElement).toBe(undoButton());
    click(undoButton(), 0);
    expect(rowIds()).toEqual(before);
    // Back on the restored row removed last (it was second in the list).
    expect(document.activeElement).toBe(removeButton(1));
  });
});
