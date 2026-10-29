# BrandSentinel Design System (frontend)

Warm ivory / ink / vermilion editorial system. This file is the source of truth for UI work.

## Tokens (tailwind.config.js)

| Token | Value | Use |
|---|---|---|
| `ivory` | `#F8F4EC` | Page background |
| `ink` (`.soft` `.muted` `.faint`) | `#251C19` / `#4A3F3A` / `#6E625A` / `#8B7F76` | Primary → tertiary text |
| `vermilion` (`.hover` `.tint`) | `#C83232` / `#A82B27` / `#F9EAE7` | Primary action, accents, active markers |
| `surface` (`.alt` `.inset`) | `#FFFFFF` / `#FDFBF7` / `#F1EADD` | Cards, hover, inset controls |
| `line` (`.strong`) | `#E6DDCC` / `#D8CDB8` | Hairline borders |

Legacy scales (`midnight`, `slate`, `indigo`, `teal`, `amber`, `red`, `purple`, `blue`, `pink`)
are **remapped** so existing class names resolve to light-theme roles — see the comment block in
`tailwind.config.js`. Do not reintroduce dark values.

- `bg-midnight-950` = ivory page · `bg-midnight-900` = white card · `bg-midnight-800` = inset + hairline border
- `text-slate-100/200` = ink · `text-slate-300/400` = secondary/muted
- `indigo-*` = vermilion · `teal/emerald` = verified · `amber` = caution · `red` = critical

Fonts: **Fraunces** (`font-display`) for display/page headings, **Inter** for UI, **JetBrains Mono**
(`font-mono`) for identifiers, numbers, timestamps.

Radii: cards/panels `rounded-lg`, controls `rounded-md`, pills `rounded-full` only for badges/dots/avatars.
Shadows: warm neutral only (`shadow-xs/sm/md/lg/xl/card`) — never coloured glows.

## Shared primitives — `src/components/ui.tsx`

`Button` (primary | secondary | ghost | danger, `size`, `loading`, `icon`), `Panel`,
`Badge` + `statusTone(status)`, `Input` / `Textarea` / `Select` / `Field`,
`Skeleton`, `EmptyState`, `ErrorState`, `Modal` (Esc + focus), `useToast()` (`success/error/info`),
`PageHeader`.

Prefer these over ad-hoc markup when touching a page.

## Page structure (match `pages/OverviewPage.tsx`)

```
<div className="space-y-6">
  {/* borderless header: icon tile + eyebrow(uppercase vermilion) + h1(font-display) + description | actions */}
  {error && <ErrorState onRetry={reload} />}
  {/* content in <Panel> blocks, grid gap-6 */}
</div>
```

Rules:
1. **No fabricated data.** Remove `|| 88`, `|| 2`, hard-coded fallback arrays (e.g. default
   chart data) and hard-coded counts. Show `—` / `EmptyState` when the API returns nothing.
2. **Loading**: use `<Skeleton>` wherever a `loading` flag exists (currently unused in several pages).
3. **Empty / error**: `EmptyState` with a real next action; `ErrorState` with retry.
4. **Mutations** (create/update/reset/approve): wrap in `try/catch` and report through
   `useToast()` — `success` on completion, `error` with `err.message` on failure. Never show a
   success toast for a failed call.
5. **Header banners**: replace `bg-gradient-to-r from-midnight-900 to-midnight-850 … shadow-xl`
   wrappers with the borderless header pattern above.
6. **Tables**: `text-xs`, `divide-y divide-line`, `border-b border-line` head, hover `hover:bg-ivory/70`,
   status via `<Badge tone={statusTone(...)}>`.
7. **Inputs**: `<Input>` / `<Select>` / `<Textarea>` from `ui` (focus ring is built in).
8. Preserve every existing API call, prop, route and behaviour — restyle only, plus the states above.
9. Accessibility: buttons keep `type` semantics, icon-only buttons need `aria-label`/`title`,
   don't remove existing labels, keep `prefers-reduced-motion` safe (no JS animation loops).
