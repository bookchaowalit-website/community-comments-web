# Design

Since 2026-11-19 the comments desk uses the shared **App shell** (see `APP-SHELL.md`; `app/app-shell.css` and `components/app-shell.tsx` are copied byte for byte
from the reference site). It replaced the earlier one-off look, whose small uppercase labels, unloaded or
render-blocking fonts and low-contrast text failed the design floor (review 2026-11-11).

- Sidebar queue (All / Pending / Approved / Spam with counts; a pill row on phones), head with h1, count,
  search and **New comment**, the composer in place (author, comment, Mark as segmented control).
- Rows: author, one line of the comment (Show more for longer ones), date, a status pill (text + tint),
  Remove. Removing is undoable for a few seconds; no confirm dialog.
- Add stays disabled until the author has text, with a hint saying so (it used to return silently).
- Empty states differ for an empty queue, an empty status and a search with no match (Clear search).

Floor: Geist via `next/font` (variable on `<html>`), text ≥ 12px, controls ≥ 44px, 4.5:1 text contrast in
light and dark, 3px focus ring, forced-colors support, no horizontal scroll at 320px. `/more-projects`
redirects (308) to https://bookchaowalit.com/ and the footer links there.
