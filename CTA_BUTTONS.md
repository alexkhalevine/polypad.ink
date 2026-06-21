# Handoff: Polypad CTA Buttons

A spec for one reusable `<Button>` component with **three variants** — the redesigned call-to-action buttons from the Polypad homepage. Hand this to your code agent and implement it with your codebase's existing component/styling patterns. Values below are literal and final; match them closely.

## The three variants

| Variant | Used for | Role |
|---|---|---|
| `primary` | **Create Drawing Room** | Main action — solid violet gradient |
| `secondary` | **API Docs** | Violet-tinted outline |
| `ghost` | **Send Feedback** | Low-emphasis, neutral outline |

## Shared anatomy
- `display:flex; align-items:center; gap:9px` — leading line icon + label.
- Font: **Space Grotesk**, `font-size:15px` (ghost: `14px`), `font-weight:600` (ghost: `500`).
- `border-radius:13px`, `cursor:pointer`.
- Icons: **Lucide** line style, `stroke-width:1.8`, `currentColor` (inherits the button's text color), 18px (ghost 17px).
- Transition the hover properties (~`.15s ease`).

## Variant specs

### primary — "Create Drawing Room"
```css
height: 52px;
padding: 0 26px;
border: none;
border-radius: 13px;
background: linear-gradient(95deg, #8b6dff, #a06bff);
color: #ffffff;
font-weight: 600;
font-size: 15px;
box-shadow: 0 10px 30px rgba(139,109,255,0.30);
/* hover */          filter: brightness(1.08);
```
Icon: Lucide **box** (`M12 2 3 7v10l9 5 9-5V7l-9-5Z` + `M3 7l9 5 9-5M12 12v10`).

### secondary — "API Docs"
```css
height: 52px;
padding: 0 24px;
border: 1px solid rgba(139,109,255,0.50);
border-radius: 13px;
background: rgba(139,109,255,0.12);
color: #c4b5ff;
font-weight: 600;
font-size: 15px;
/* hover */          background: rgba(139,109,255,0.22);
```
Icon: Lucide **code** (`m8 16-4-4 4-4M16 8l4 4-4 4M14 4l-4 16`).

### ghost — "Send Feedback"
```css
height: 48px;
padding: 0 22px;
border: 1px solid rgba(255,255,255,0.12);
border-radius: 13px;
background: rgba(255,255,255,0.04);
color: #c7c7d1;
font-weight: 500;
font-size: 14px;
/* hover */          background: rgba(255,255,255,0.08); color: #ffffff;
```
Icon: Lucide **message-square** (`M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z`).

## Layout context (optional)
On the homepage, `primary` + `secondary` sit in one centered flex row (`gap:12px; flex-wrap:wrap`); `ghost` is on its own row below (`margin-top:12px`), also centered.

## Optional accent toggle
The homepage supports a `primaryAccent` of `violet` (default) or `mint`. When `mint`, the **primary** button only changes to:
```css
background: linear-gradient(95deg, #4fe3c1, #48b3ff);
color: #072019;
```
Skip this if you don't need theming — `violet` is the default everywhere.

## Suggested API
```tsx
<Button variant="primary" | "secondary" | "ghost" icon={<…>}>Label</Button>
```
Props: `variant` (required), `icon` (ReactNode, optional leading icon), `children` (label), plus passthrough `onClick`/`href`/`disabled`. Reuse your existing button primitive if you have one — only the per-variant CSS above needs to match.
