// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
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
