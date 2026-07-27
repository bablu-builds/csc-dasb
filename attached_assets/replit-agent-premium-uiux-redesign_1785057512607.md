# Replit Agent Prompt — Premium UI/UX Design Overhaul

Copy everything below and paste it into Replit Agent:

---

Act as a senior UI/UX designer and front-end engineer. I want you to give my CSC shop management app (AZAAN CSC Management) a complete, premium, professional visual redesign — not just small tweaks, but a genuinely polished, unique interface that looks like a paid SaaS product, not a template. Apply the following design system consistently across every single page (Login, Dashboard, All Work, Pending Work, Deleted Items, Reports, Settings).

## 1. Design Identity (Do This First)
- Define a clear visual identity: a refined color palette (not generic default blue/orange) — choose a sophisticated primary color, a warm accent color, and neutral tones for backgrounds/text that feel premium and trustworthy (think fintech/government-service apps, not a toy app).
- Pick a strong typography system: one font for headings with real character, and a clean, highly readable font for body text and data tables. Use consistent font weights and sizes for a clear hierarchy (page titles, section headers, labels, body text, captions).
- Define consistent spacing and sizing rules (a spacing scale, e.g., 4px/8px/16px/24px/32px) and apply it everywhere — no more inconsistent padding/margins between pages.
- Establish a consistent border-radius, shadow style, and elevation system for cards, buttons, and modals so everything feels part of one cohesive design language.

## 2. Layout & Structure
- Redesign the navigation into a clean, modern sidebar (on desktop) that collapses into a bottom nav or hamburger menu on mobile — with icons + labels, clear active-state highlighting, and smooth transitions.
- Add a proper top header/topbar showing the shop name/logo, a search shortcut, and the logged-in user with a logout option.
- Use a card-based layout for the Dashboard and lists — with proper visual grouping, not just plain tables floating on a white background.
- Ensure generous white space so the interface doesn't feel cramped, while keeping information density appropriate for daily business use.

## 3. Components — Make Them Feel Premium
- Buttons: distinct primary, secondary, and destructive (delete) button styles, with subtle hover/press animations and clear disabled states.
- Forms: floating or clearly positioned labels, subtle focus rings on inputs, inline validation states (success green outline, error red outline with message), and well-spaced form layouts (not walls of stacked fields).
- Tables/Lists: alternating row shading or clear dividers, sticky headers on scroll, status badges with color coding (Pending/Completed/Rejected) styled as pill-shaped tags, and hover highlighting on rows.
- Modals/Dialogs: centered, with a soft backdrop blur or dim overlay, smooth fade/scale-in animation, and a clear close action.
- Empty states and loading states: custom-designed (not just plain text) — use simple icons or illustrations with friendly, helpful copy.
- Toasts/notifications: modern, non-intrusive, auto-dismissing, color-coded by type (success/error/info).

## 4. Dashboard — Make It the Showpiece
- Redesign summary cards with icons, color accents, and subtle background gradients or tinted backgrounds (not flat white boxes).
- Style the earnings chart professionally — clean axis labels, smooth line/bar rendering, tooltips on hover, and a color that matches the overall palette.
- Give the "Today's Pending Reminders" section strong visual priority at the top — make it feel like an important alert banner/card, not just another list.

## 5. Micro-interactions & Motion
- Add subtle, tasteful animations: fade-ins for page loads, smooth transitions when switching tabs or filters, gentle scale/hover effects on interactive elements, and animated number counters on the dashboard stats (counting up on load).
- Keep all animations fast (150-300ms) and purposeful — nothing should feel slow or distracting.

## 6. Responsiveness & Polish
- Ensure pixel-perfect responsiveness across mobile, tablet, and desktop — test that the sidebar/nav, tables, and forms all adapt gracefully.
- Make sure touch targets on mobile are large enough to tap comfortably (buttons, dropdowns, status selectors).
- Add favicon, page title, and a polished login page as the first impression — centered card, subtle branding, clean input fields, and a professional welcome message.

## 7. Consistency Check (Final Step)
- After implementing the redesign, review every page side-by-side to confirm the color palette, typography, spacing, and component styles are fully consistent — no page should look like it belongs to a different app.

## Important Notes
- Do not change any existing functionality, data structure, or Firestore logic — this is a visual/UX redesign only.
- Keep the interface simple enough for non-technical shop staff to use comfortably — premium design should not add confusion or clutter.
- Implement this incrementally (page by page or section by section) and confirm the app still builds and runs correctly after each major change.

---

**After implementation, ask Replit to:** "Show me screenshots or a summary of the redesigned pages, and confirm there are no build errors before I deploy."
