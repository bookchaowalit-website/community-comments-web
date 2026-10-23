# Comments Review Desk

A browser-only moderation demo: a queue of comments (two samples to start) you can filter by status (All, Pending,
Approved, Spam), search by author or text, add to (author, text, status) and delete. The list is kept in this
browser's localStorage.

Live: https://comments.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does not do

- Not a comment system: no embed, server, database, SQLite, server-side rendering, spam detection or account.
- A comment's status is set when it is added and cannot be changed afterwards; there is no approve/reject action.
- Nothing syncs between browsers or devices.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: queue logic, MCP route, home page render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Code map

- `lib/comments.ts`: sample comments, `parseComments` (validates stored data), `filterComments`, `countByStatus`,
  `addComment`, `removeComment` (used by the page and the MCP route).
- `lib/use-stored-state.ts`: localStorage-backed state via `useSyncExternalStore` (server render uses the samples).
- `app/api/mcp/route.ts`: stateless JSON-RPC endpoint with `list_comments` and `count_by_status` over the samples.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped; off when
  `NEXT_PUBLIC_SENTRY_DSN` is unset.
- `app/more-projects/page.tsx`: shared portfolio link page (copied per repository, not a package).
