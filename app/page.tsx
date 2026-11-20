"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { FILTERS, SEED, STATUSES, STORAGE_KEY, addComment, countByStatus, filterComments, formatCreated, parseComments, restoreComment, type Comment, type Filter, type Status } from "@/lib/comments";
import { useStoredState } from "@/lib/use-stored-state";

// beforeId: the comment that followed it when it was removed. nextShown / prevShown: the rows shown around it, for focus.
type RemovedEntry = { comment: Comment; beforeId: string | null; nextShown?: string; prevShown?: string };
type RemovedBatch = { entries: RemovedEntry[]; viaKeyboard: boolean };
const removedLabel = (entries: RemovedEntry[]) => (entries.length === 1 ? `Removed ${entries[0].comment.title}` : `Removed ${entries.length} comments`);
type Draft = { title: string; body: string; status: Status };

const EMPTY_DRAFT: Draft = { title: "", body: "", status: "Pending" };
const TONE: Record<Status, Tone> = { Pending: "amber", Approved: "green", Spam: "red" };
const LIST_LABEL: Record<Filter, string> = { All: "All comments", Pending: "Pending", Approved: "Approved", Spam: "Spam" };

// One line of the comment per row (App shell rule); a longer one gets Show more.
function CommentBody({ body }: { body: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { if (el.dataset.expanded !== "true") setClipped(el.scrollWidth > el.clientWidth); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    measure();
    // A web font that loads later can widen the text without resizing the box, so measure again then.
    let live = true;
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    const remeasure = () => { if (live) measure(); };
    fonts?.ready?.then(remeasure, () => {});
    fonts?.addEventListener?.("loadingdone", remeasure);
    return () => {
      live = false;
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", remeasure);
    };
  }, [body]);
  const long = expanded || clipped || body.includes("\n");
  return (
    <>
      <p ref={ref} id={id} className="as-row-detail" data-expanded={expanded ? "true" : undefined}>{body}</p>
      {long ? (
        <button type="button" className="as-plain as-row-more" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </>
  );
}

export default function Home() {
  const [items, setItems] = useStoredState(STORAGE_KEY, SEED, parseComments);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  // Every removal still inside the Undo window: one Undo puts them all back where they were.
  const [removed, setRemovedState] = useState<RemovedBatch | null>(null);
  // The latest batch, so two removals before a re-render still both land in it.
  const removedRef = useRef<RemovedBatch | null>(null);
  const setRemoved = (batch: RemovedBatch | null) => { removedRef.current = batch; setRemovedState(batch); };
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const wasComposing = useRef(false);
  const focusNext = useRef<string[] | null>(null);
  const visible = useMemo(() => filterComments(items, filter, query), [items, filter, query]);
  const counts = useMemo(() => countByStatus(items), [items]);

  // Opening the composer focuses the author; closing it returns focus to New comment.
  useEffect(() => {
    if (composing) titleRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // After the toast closes, focus goes to the nearest row still shown, else New comment.
  useEffect(() => {
    const ids = focusNext.current;
    if (removed || !ids) return;
    focusNext.current = null;
    const rows = [...document.querySelectorAll<HTMLElement>(".as-row[data-comment]")];
    const row = ids.map((id) => rows.find((r) => r.dataset.comment === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current ?? titleRef.current)?.focus();
  }, [removed, items]);
  // Reserve the toast's height at the bottom so a control focused behind it scrolls clear.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    const reserve = () => rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    reserve();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(reserve) : null;
    observer?.observe(toast);
    return () => { observer?.disconnect(); rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);
  // The toast closes 6 s after the latest removal (each removal restarts it), but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => { removedRef.current = null; setRemovedState(null); }, 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Added to the latest saved queue, not the list this tab rendered (another tab may have saved since).
    const now = Date.now();
    const next = setItems((current) => addComment(current, draft, now));
    if (next[0]?.id !== `c-${now}`) return;
    // Show the new comment: its own list, and no search that might hide it.
    if (filter !== "All" && filter !== draft.status) setFilter(draft.status);
    setQuery("");
    setAnnouncement(`Added a comment by ${next[0].title}.`);
    setDraft(EMPTY_DRAFT);
    setComposing(false);
  }
  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }
  function remove(comment: Comment, viaKeyboard: boolean) {
    const shownAt = visible.findIndex((item) => item.id === comment.id);
    // Removed from the latest saved queue; its neighbour there is what Undo puts it back before.
    const hit = { found: false, beforeId: null as string | null };
    setItems((current) => {
      const index = current.findIndex((item) => item.id === comment.id);
      if (index < 0) return current;
      hit.found = true;
      hit.beforeId = current[index + 1]?.id ?? null;
      return current.filter((item) => item.id !== comment.id);
    });
    if (!hit.found) return;
    const entry: RemovedEntry = { comment, beforeId: hit.beforeId, nextShown: visible[shownAt + 1]?.id, prevShown: shownAt > 0 ? visible[shownAt - 1].id : undefined };
    const entries = [...(removedRef.current?.entries ?? []), entry];
    setRemoved({ entries, viaKeyboard });
    setAnnouncement(entries.length === 1 ? `Removed the comment by ${comment.title}. Undo is available for a few seconds.` : `Removed ${entries.length} comments. Undo is available for a few seconds.`);
  }
  function closeToast(ids?: string[]) {
    const last = removedRef.current?.entries.at(-1);
    // Dismissed: the row after the removed one, else the one before it.
    focusNext.current = ids ?? [last?.nextShown, last?.prevShown].filter((id): id is string => Boolean(id));
    setRemoved(null);
    setToastFocused(false);
  }
  // Keyboard way back to the rows that keeps the Undo batch (Escape drops it): focus the row after the
  // latest removal, else the one before it, else New comment. Removing that row adds it to the same batch.
  function backToList() {
    const last = removedRef.current?.entries.at(-1);
    const rows = [...document.querySelectorAll<HTMLElement>(".as-row[data-comment]")];
    const row = [last?.nextShown, last?.prevShown].map((id) => rows.find((r) => r.dataset.comment === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current)?.focus();
  }
  function undo() {
    const entries = removedRef.current?.entries;
    if (!entries?.length) return;
    // Latest removal first: each goes back before the comment that followed it when it was removed.
    setItems((current) => entries.reduceRight((list, { comment, beforeId }) => restoreComment(list, comment, beforeId), current));
    const latest = entries[entries.length - 1].comment;
    setAnnouncement(entries.length === 1 ? `Restored the comment by ${latest.title}.` : `Restored ${entries.length} comments.`);
    // Undone: back to the restored row the user removed last.
    closeToast([latest.id]);
  }

  const title = LIST_LABEL[filter];
  const lists = FILTERS.map((value) => ({ value, tone: value === "All" ? undefined : TONE[value] }));

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Comments" tagline="A local moderation desk" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>Queue</h2>
          <ul className="as-lists">
            {lists.map(({ value, tone }) => (
              <ListButton key={value} label={LIST_LABEL[value]} count={counts[value]} tone={tone} current={filter === value} onSelect={() => setFilter(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{visible.length} {visible.length === 1 ? "comment" : "comments"}{query.trim() ? ` matching “${query.trim()}”` : ""}</p>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search comments</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New comment</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New comment">
              <label className="as-field">Author
                <input ref={titleRef} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Who wrote it, e.g. mia" autoComplete="off" required />
              </label>
              <label className="as-field">Comment
                <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="What did they say?" rows={3} />
              </label>
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="status-label">Mark as</span>
                  <div className="as-segmented" role="group" aria-labelledby="status-label">
                    {STATUSES.map((status) => (
                      <button key={status} type="button" aria-pressed={draft.status === status} onClick={() => setDraft({ ...draft, status })}>{status}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY_DRAFT); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!draft.title.trim()}>Add</button>
                </div>
              </div>
              {draft.title.trim() ? null : <p className="as-hint">Add an author to enable Add.</p>}
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((comment) => (
                <li className="as-row" key={comment.id} data-comment={comment.id}>
                  <div>
                    <h3>{comment.title}</h3>
                    <CommentBody body={comment.body} />
                    <p className="as-row-meta"><time dateTime={new Date(comment.createdAt).toISOString()}>{formatCreated(comment.createdAt)}</time></p>
                  </div>
                  <Pill tone={TONE[comment.status]}>{comment.status}</Pill>
                  <button type="button" className="as-plain as-danger" aria-label={`Remove the comment by ${comment.title}`} onClick={(event) => remove(comment, event.detail === 0)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {query.trim() ? (
                <>
                  <strong>Nothing matches</strong>
                  No comment in {filter === "All" ? "the queue" : title} mentions “{query.trim()}”.
                  <div className="as-actions-row as-center"><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
                </>
              ) : items.length === 0 ? (
                <><strong>The queue is empty</strong>Press New comment to add one and try the moderation flow.</>
              ) : (
                <><strong>Nothing marked {title} yet</strong>Press New comment and mark it {title} to add one here.</>
              )}
            </div>
          )}

          <p className="as-note">A portfolio demo, not a connected comment system: comments are saved in this browser only, with no server and no sync.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>{removedLabel(removed.entries)}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label={removed.entries.length === 1 ? "Undo remove" : `Undo remove of ${removed.entries.length} comments`}>Undo</button>
          <button type="button" className="as-plain" onClick={backToList}>Back to list</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/community-comments-web" />
    </div>
  );
}
