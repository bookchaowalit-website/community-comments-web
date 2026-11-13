# Comments — design direction

<!-- impeccable:design-schema 1 -->

## World

Comments is a small editorial review desk. The sentence is set in a serif reading voice, the queue is a ruled tape, and status is a stamp at the margin. The interface feels like a working archive rather than a generic admin dashboard.

## Direction contract

- Seed: `8b72de19`; assigned grounded candidate 7.
- First viewport: the moderation thesis, queue rail, review tape, and new-note form are visible together.
- Form: left filter index, text-led list, narrow compose column, and stamped status labels.
- Interaction: search, filter, add, and delete remain local and immediate.
- Material: warm paper, charcoal ink, hairline rules, muted green approval, red spam, ochre pending.
- Responsive rule: filters become a compact row and compose moves below the tape on narrow screens.

## Constraints kept honest

Data remains browser-local. The design does not imply a connected CMS, moderation team, or synced comment backend.


---

## Storybook

Storybook 10 (`@storybook/nextjs-vite`) shows this design system with the app's real CSS, tokens and fonts.

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/ (CI: .github/workflows/storybook.yml)
```

- **Foundations/Tokens** reads every CSS custom property the app defines at runtime, so it never drifts from the code.
- **Design/DESIGN.md** renders this file.
- **Components/**, **Sections/** and **Pages/** show the UI with mock data only (no network, analytics off).
- Toolbar: locale, theme (light / dark, when the app has a dark theme), viewports 320 / 375 / 768 / 1440. The a11y panel runs axe (WCAG 2.2 AA).
- Rule: a new shared component or page section ships with a story in `stories/`.
