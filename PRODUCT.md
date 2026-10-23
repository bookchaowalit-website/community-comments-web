# Comments Review Desk — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `comments`, evidence Prototype) on 2026-10-23.

## What it is

A client-only demo of a comment moderation queue over browser-local data, seeded with two sample comments.

## Who it is for

A portfolio visitor who wants to see a small moderation UI: queue filters with counts, search, add and delete.

## What works today

1. Filter the queue by All, Pending, Approved or Spam (each with a live count) and search author and text.
2. Add a comment (author required; empty text becomes "No note added.") with a chosen status; delete any comment.
3. The queue is saved in localStorage and survives a reload; broken or foreign stored data is ignored and the samples
   are shown instead.
4. `/api/mcp` answers JSON-RPC with `list_comments` and `count_by_status` over the two sample comments (it cannot see
   comments added in a browser).
5. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No self-hosted comment system, SQLite, server-side rendering, embeds, spam protection or portfolio-wide rollout
  (claims removed from the portfolio card in the 2026-10 review).
- No status change after adding, no replies, no account, no sync. No product analytics beyond Vercel Analytics.

## Live URL and deploy state

- Live: https://comments.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-comments-frontend` is deployed only by CLI (last production 2026-10-23, CLI deploy
  of commit 5d4675c, the Next 16.4.2 security patch) and its Git link names the old repository
  `bookchaowalit/bookchaowalit-comments-frontend`, so a push to `main` does not deploy. The live site lags `main`
  (no Sentry, template MCP route) until the owner reconnects Vercel Git to this repository (owner action D9).
  `NEXT_PUBLIC_SENTRY_DSN` is already set on the Vercel project (Sentry project `community-comments-web`, org
  `personal-yu0`).

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route.
