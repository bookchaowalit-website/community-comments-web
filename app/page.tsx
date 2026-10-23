"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FILTERS, SEED, STORAGE_KEY, addComment as add, countByStatus, filterComments, parseComments, removeComment, type Filter, type Status } from "@/lib/comments";
import { useStoredState } from "@/lib/use-stored-state";
type IconName = "archive" | "check" | "alert" | "plus" | "search" | "trash";
function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, string> = {
    archive: "M4 4h16v16H4z M8 8h8 M8 12h8",
    check: "m5 12 4 4L19 6",
    alert: "M12 8v4 M12 16h.01 M5 20h14l-7-16Z",
    plus: "M12 5v14 M5 12h14",
    search: "m21 21-4.3-4.3 M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
    trash: "M4 7h16 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3",
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

export default function Home() {
  const [items, setItems] = useStoredState(STORAGE_KEY, SEED, parseComments);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("Pending");
  const filtered = useMemo(() => filterComments(items, filter, query), [filter, items, query]);
  const counts = useMemo(() => countByStatus(items), [items]);
  const addComment = () => { if (!title.trim()) return; setItems((current) => add(current, { title, body, status }, Date.now())); setTitle(""); setBody(""); setStatus("Pending"); };
  const stamp = (value: Status) => value === "Approved" ? <Icon name="check" size={13} /> : value === "Spam" ? <Icon name="alert" size={13} /> : <Icon name="archive" size={13} />;

  return (
    <main className="comments-shell">
      <header className="comments-topbar"><Link className="comments-brand" href="/"><span>CD</span><strong>COMMENTS / REVIEW DESK</strong></Link><span className="comments-local">LOCAL ONLY / EDITORIAL PASS</span></header>
      <section className="comments-intro"><div><p className="comments-kicker">MODERATION WORKSPACE / 01</p><h1>Clear the queue<br /><i>without losing the sentence.</i></h1></div><p className="comments-intro-copy">A small local desk for reading, marking, and removing demo comments. Every action stays in this browser.</p></section>
      <div className="comments-workspace">
        <aside className="comments-rail"><div className="comments-rail-label">VIEW QUEUE</div>{FILTERS.map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)} type="button"><span>{item}</span><b>{counts[item]}</b></button>)}<div className="comments-rail-note"><span>HONEST STATUS</span><p>This is a portfolio demo, not a connected comment system.</p></div></aside>
        <section className="comments-inbox" aria-labelledby="inbox-heading"><div className="comments-section-head"><div><span className="comments-section-index">A</span><h2 id="inbox-heading">Review tape</h2></div><label className="comments-search"><Icon name="search" size={15} /><span className="sr-only">Search comments</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a name or sentence" /></label></div><div className="comments-rule" />
          <ul className="comments-list">{filtered.map((item) => <li className="comment-row" key={item.id}><div className={`comment-stamp stamp-${item.status.toLowerCase()}`}>{stamp(item.status)}<span>{item.status}</span></div><div className="comment-copy"><div className="comment-meta"><strong>{item.title}</strong><time dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleDateString("en-GB")}</time></div><p>{item.body}</p></div><button className="comment-delete" type="button" onClick={() => setItems((current) => removeComment(current, item.id))} aria-label={`Delete comment by ${item.title}`}><Icon name="trash" size={15} /></button></li>)}{filtered.length === 0 ? <li className="comments-empty">No comments match this view.</li> : null}</ul></section>
        <aside className="comments-compose"><div className="comments-section-head"><div><span className="comments-section-index">B</span><h2>New note</h2></div><Icon name="plus" size={17} /></div><p className="comments-compose-copy">Add a local comment to test the moderation flow.</p><label><span>AUTHOR / TITLE</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. mia" /></label><label><span>THE SENTENCE</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the comment..." /></label><label><span>MARK AS</span><select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option>Pending</option><option>Approved</option><option>Spam</option></select></label><button className="comments-add" type="button" onClick={addComment}>Add to tape <Icon name="plus" size={15} /></button></aside>
      </div>
      <footer className="comments-footer"><span>COMMENTS / LOCAL STORAGE</span><span>NO SERVER CLAIMS / NO HIDDEN SYNC</span></footer>
    </main>
  );
}
