---
name: Design System
description: AZAAN CSC premium design tokens, fonts, and component patterns
---

# Design System — AZAAN CSC

## Palette
- Primary (buttons, links, active nav): `#4f46e5` (indigo-600) → HSL: `244 76% 58%`
- Sidebar background: `#080f1f` → HSL: `222 47% 8%`
- Sidebar active item: `bg-sidebar-primary/15 text-white` + dot indicator
- Background: `#f5f7fb` → HSL: `220 27% 97%`
- Card: `#ffffff`
- Success: emerald-600 `#059669`
- Warning/amber: `#f59e0b`
- Error/red: `#dc2626`

## Fonts
- Headings (h1, h2, h3): `Plus Jakarta Sans` — apply via `style={{ fontFamily: 'var(--app-font-display)' }}`
- Body: `Inter` — set as default via `--app-font-sans`

## Gradient Stat Cards
Named CSS classes in index.css:
- `stat-gradient-indigo` — primary stats
- `stat-gradient-emerald` — profit/success
- `stat-gradient-amber` — warning/pending
- `stat-gradient-rose` — danger/dues
- `stat-gradient-violet` — secondary financial
- `stat-gradient-sky` — AEPS/volume

## Animations
- `animate-fade-in-up` — page loads, new sections
- `animate-fade-in` — overlays/modals
- `animate-slide-in-left` — mobile sidebar drawer
- `animate-count-up` — stat values
- `.stagger-children` — apply to a wrapper to stagger child animations

## Shadow System
- `shadow-card` — default card resting state
- `shadow-card-hover` — on hover
- Cards use `rounded-xl` (10px), modals use `rounded-2xl` (16px)

**Why:** Indigo chosen over generic bright-blue for premium SaaS feel (like Linear/Vercel). Dark sidebar creates clear visual hierarchy between nav and content.
