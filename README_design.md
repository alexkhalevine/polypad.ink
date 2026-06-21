# Handoff: Polypad — Collaborative 3D Drawing App (UI Redesign)

## Overview
This is a hi-fi UI redesign of **Polypad**, a web-based collaborative 3D drawing/modeling app. It covers two screens — a **Landing / room-creation** screen and the main **3D Editor** — plus the selected-object editing experience and basic collaboration affordances (invite, presence avatars, live cursor).

The redesign's goals (per the original brief) were to fix four problems in the existing app: weak/missing toolbar icons, unclear object selection, a cluttered UI, and lack of visual innovation. The solution organizes all chrome into **four docked regions** (top bar, left tool rail, contextual object toolbar, right inspector) and adds strong selection feedback.

## About the Design Files
The files in this bundle are **design references created in HTML** — a streaming prototype that shows the intended look and behavior. **They are not production code to copy directly.** `Polypad 3D.dc.html` is a "Design Component" that depends on a proprietary runtime (`support.js`) for templating, control-flow tags (`<sc-if>`), and prop wiring; you should **not** ship that runtime. Treat the HTML as a visual + behavioral spec.

Your task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, etc.) using its established patterns, component library, and styling system. If no front-end environment exists yet, pick the most appropriate framework for the project (React + a 3D lib like **three.js / react-three-fiber** is the natural fit for the actual 3D viewport) and implement there. The 3D box in the prototype is faked with CSS 3D transforms purely for the mockup — in the real app it should be a real WebGL/three.js scene.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interaction states are specified below and should be reproduced closely. Recreate the UI using the codebase's existing primitives where they exist; match the exact tokens listed in **Design Tokens**.

---

## Screens / Views

### 1. Landing / Room Creation
- **Purpose:** User names a room and creates (or joins) a collaborative session.
- **Layout:** Full-viewport, dark radial background. Centered column (`width: 420px`, flex column, center-aligned, text-centered). A decorative animated wireframe cube and a faint perspective grid float behind the card at low opacity.
- **Components:**
  - **Wordmark** "polypad" — `Space Grotesk`, weight 700, `font-size: 48px`, `letter-spacing: -0.04em`, gradient text (see Logo note). Below it, a tagline: "Collaborative 3D sketching, right in your browser." — `15px`, color `#9a9aa6`, `margin-top: 8px`.
  - **Card** — `padding: 24px`, `background: rgba(18,18,26,0.7)` with `backdrop-filter: blur(22px)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 20px`, `margin-top: 36px`.
    - Section label "NAME YOUR ROOM" — `12px`, weight 600, `letter-spacing: 0.08em`, color `#6b6b78`.
    - Input row — height `50px`, `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(139,109,255,0.4)`, `border-radius: 12px`, `padding: 0 14px`. Contents (JetBrains Mono, `14px`): muted prefix `polypad.io/` (`#6b6b78`) + value `studio-lamp` (`#e7e7ef`) + a blinking caret bar (`2×18px`, `#8b6dff`, 1.1s blink).
    - **Create Room** button — full width, height `50px`, `border-radius: 12px`, gradient `linear-gradient(95deg,#8b6dff,#a06bff)`, white text, weight 600, `15px`, trailing arrow icon. Hover: `brightness(1.1)`.
    - "or" divider (1px lines + `#6b6b78` label).
    - **Join with a room code** — secondary button, full width, height `46px`, transparent with `1px solid rgba(255,255,255,0.12)`, text `#c7c7d1`. Hover: `background: rgba(255,255,255,0.05)`, text `#fff`.
  - **Status line** below card — mint dot (`#4fe3c1`, glow) + "128 makers building live right now", `13px`, `#6b6b78`.

### 2. 3D Editor (main canvas)
- **Purpose:** Create and manipulate 3D primitives on an infinite grid; edit a selected object; collaborate live.
- **Layout:** Full-viewport. A 3D canvas fills the background; four floating/docked panels overlay it. All panels use the same surface treatment: `background: rgba(18,18,26,0.72–0.78)`, `backdrop-filter: blur(20–22px)`, `border: 1px solid rgba(255,255,255,0.08)`, rounded `16–18px`, `z-index: 20`.
- **Canvas:**
  - Perspective grid floor: grid lines `rgba(140,150,210,0.10)`, `120px` cells, tilted `rotateX(66deg)`, radially masked to fade at the edges. A soft violet horizon glow sits above center.
  - The selected object (a Box) is rendered center-left, slightly raised, with three shaded faces (top `#6ea7ff→#4d8bf0`, front `#3f7fe8→#3370d8`, right `#2c5fc8→#244fa8`). In the real app this is a three.js mesh.
  - **Contact shadow** ellipse beneath the object.

- **Components (overlays):**

  **A. Top bar** — height `60px`, full width, transparent, `padding: 0 18px`, space-between.
  - Left: wordmark "polypad" (`21px`, weight 700, gradient — see Logo note) · 1px divider · **room pill** — `padding: 6px 12px`, `radius: 10px`, `rgba(255,255,255,0.05)` bg with `rgba(255,255,255,0.08)` border, containing a blinking mint live-dot (`#4fe3c1`, glow) + room name `studio-lamp` (JetBrains Mono `13px`, `#c7c7d1`).
  - Right: **presence avatar stack** (30px circles, `2px` `#0c0b12` border, overlapping `-9px`; gradient fills) · **Invite** button (mint `#4fe3c1` bg, text `#072019`, weight 600, `13px`, user-plus icon, `padding: 8px 15px`, `radius: 11px`; hover `#6bf0d2`) · **Export** button (outline: `border: 1px solid rgba(139,109,255,0.5)`, `background: rgba(139,109,255,0.12)`, text `#c4b5ff`, download icon; hover bg `rgba(139,109,255,0.22)`).

  **B. Left tool rail** — vertical, docked `left: 16px; top: 72px`, `padding: 6px`, `radius: 16px`, `gap: 4px`. Five `44×44px` icon buttons, `radius: 12px`:
    - Select (S) — pointer/cursor icon
    - Move (M) — 4-way move arrows
    - Rotate (R) — rotate-cw arc
    - Scale (E) — corner-expand arrows
    - (1px divider)
    - Orbit camera (C) — orbit (circle + arcs) icon
    - **States:** default text `#b9b9c6`, transparent; hover `background: rgba(255,255,255,0.06)`; **active** `background: rgba(139,109,255,0.18)`, `border: 1px solid rgba(139,109,255,0.55)`, text `#c4b5ff`. Tooltips via title attr; show shortcut key.

  **C. Contextual object toolbar** — appears **only when an object is selected**, floating just above it (`left: 46%`, `top: 32%`, centered). Pill, `padding: 6px`, `radius: 14px`, drop shadow `0 12px 40px rgba(0,0,0,0.5)`. Five `38×38px` icon chips (`radius: 9px`, text `#c7c7d1`, hover `rgba(255,255,255,0.08)`/`#fff`):
    - Align (vertical-align icon) · Boolean (two overlapping circles) · Duplicate (copy icon) · Group (corner-brackets icon) · (1px divider) · **Delete** (trash icon, text `#ff8a8a`; hover `background: rgba(255,90,90,0.15)`, `#ff6b6b`).

  **D. Right inspector** — docked `right: 16px; top: 72px; bottom: 90px`, `width: 308px`, `radius: 18px`, internal scroll. Two states:
    - **Selected state** (object = "Box"):
      - Header: `30×30px` rounded blue thumbnail w/ box icon + name "Box" (`14px`, weight 600) + id `#box-01` (JetBrains Mono `11px`, `#6b6b78`). Right: **Esc** deselect chip (`padding: 5px 9px`, `radius: 8px`, `rgba(255,255,255,0.05)`; hover fills).
      - **POSITION** section — 3-col grid (`gap: 8px`). Each field: `background: rgba(255,255,255,0.04)`, `border: 1px solid rgba(255,255,255,0.08)`, `radius: 10px`, `padding: 8px 10px`. Label (X/Y/Z, `10px`, `#6b6b78`) over value (JetBrains Mono `13px`, `#e7e7ef`). Values: `-4.65 / 0.00 / -0.38`.
      - **DIMENSIONS** section — same grid, mint-tinted: `background: rgba(79,227,193,0.06)`, `border: 1px solid rgba(79,227,193,0.25)`. Labels (W/H/D) in `#4fe3c1`, values white. Values: `4.99 / 0.78 / 2.61`.
      - **MATERIAL** section — row of `30×30px` `radius: 9px` color swatches: active `#3f7fe8` (ring `0 0 0 2px #0c0b12, 0 0 0 4px #4fe3c1`), plus `#8b6dff #ff5db1 #4fe3c1 #ffb454`, and a dashed "+" add swatch.
      - **DISPLAY** section — "Snap to grid" toggle, "Wireframe" toggle, "Opacity" slider (label + `100%`, violet fill `#8b6dff`, white knob).
    - **Unselected state:** header "Scene / No object selected"; a dashed empty-state card ("Click any shape to edit…"); a **VIEW SETTINGS** group with Snap-to-grid + Wireframe toggles.

  **E. Bottom-center shape dock** — `bottom: 22px`, centered, pill, `padding: 8px`, `radius: 18px`, shadow `0 16px 50px rgba(0,0,0,0.5)`. Label "ADD" (`11px`, `#6b6b78`) then create buttons (column: icon + `11px` label, `min-width: 62px`, `radius: 12px`, hover `rgba(255,255,255,0.07)`/`#fff`): **Box, Cylinder, Sphere, Cone**, a 1px divider, then a **"+"** more button (`42×50px`).

  **F. Bottom-left status + view controls** — `bottom: 22px; left: 16px`, row, `gap: 10px`.
    - Status readout (shown when selected): pill, JetBrains Mono `12px`, `#9a9aa6`: mint "●" + "1 selected | X -4.65 · Y 0.00 · Z -0.38".
    - Zoom controls pill: minus / `100%` / plus / divider / fit-to-view icon. `30×30px` buttons, hover `rgba(255,255,255,0.08)`.

  **G. Collaborator live cursor** — on canvas (`left: 63%; top: 40%`), pink (`#ff5db1`) arrow cursor + name pill "Maya" (`11px`, weight 600, dark text on `#ff5db1`, `radius: 6px`). Gentle float animation.

  **H. Screen switcher** — a prototype-only affordance (top-center segmented Landing/Editor toggle). **Do not ship this** — it exists only to demo both screens. Routing in the real app handles screen changes.

---

## Interactions & Behavior
- **Tool rail:** clicking a tool sets the active mode (single-select among the 5); active tool gets the violet highlight. Keyboard shortcuts: S/M/R/E/C.
- **Selection:** clicking a 3D object selects it → inspector switches to the selected state, the contextual toolbar appears above the object, dimension chips appear on the object, the object gets a mint glow (`drop-shadow(0 0 22px rgba(79,227,193,0.45))`), and the bottom-left status shows "1 selected" + coordinates.
- **Deselect:** Esc key (or the Esc chip in the inspector header) → inspector returns to Scene/View-settings state; contextual toolbar, dimension chips, glow, and status all hide.
- **On-object dimension chips:** mint (`#4fe3c1`) labels "W 4.99 / H 0.78 / D 2.61" positioned along the object's edges (JetBrains Mono `12px`, weight 600, dark text).
- **Toggles** (Snap to grid, Wireframe): pill switches (`38×22px` track, `16px` knob). On = `#8b6dff`; off = `rgba(255,255,255,0.14)`; knob slides with a `.2s` transition. Wireframe on reduces object face opacity to ~`0.22` (in the real app: render the mesh as wireframe).
- **Hover states:** all buttons/icons have the hover treatments noted above.
- **Animations:** mint live-dot blink (2.4s), input caret blink (1.1s), collaborator cursor float (5s ease-in-out), landing wireframe cube slow spin (26s linear). Toggle/tool transitions `.15–.2s`.

## State Management
- `screen`: `'editor' | 'landing'` (real app: route).
- `selectedObjectId` (or `null`) — drives inspector state, contextual toolbar, glow, dimension chips, status readout.
- `activeTool`: `'select' | 'move' | 'rotate' | 'scale' | 'camera'`.
- `snapToGrid`: boolean.
- `wireframe`: boolean.
- Per-object data: position `{x,y,z}`, dimensions `{w,h,d}`, material color, opacity.
- Collaboration (real app): presence list (avatars), live cursors (position + name + color), room name/id. Prototype shows these statically.

## Design Tokens

**Colors**
| Role | Hex |
|---|---|
| Canvas base | `#08080c` |
| BG radial | `#15131f → #0b0a11 → #08080c` |
| Panel surface | `rgba(18,18,26,0.72–0.78)` (blur 20–22px) |
| Panel border | `rgba(255,255,255,0.08)` |
| Text primary | `#e7e7ef` / `#fff` |
| Text secondary | `#c7c7d1` |
| Text muted | `#9a9aa6` |
| Label/meta muted | `#6b6b78` |
| Primary accent (violet) | `#8b6dff` (active fill `rgba(139,109,255,0.18)`, border `rgba(139,109,255,0.55)`, text `#c4b5ff`) |
| Violet gradient (buttons) | `linear-gradient(95deg,#8b6dff,#a06bff)` |
| Collab / Invite / selection accent (mint) | `#4fe3c1` |
| Object blue (faces) | top `#6ea7ff/#4d8bf0`, front `#3f7fe8/#3370d8`, right `#2c5fc8/#244fa8` |
| Material swatches | `#3f7fe8 #8b6dff #ff5db1 #4fe3c1 #ffb454` |
| Danger | `#ff6b6b` / `#ff8a8a` |
| Cursor (Maya) | `#ff5db1` |
| Grid lines | `rgba(140,150,210,0.10)` |

**Logo (use exactly, do not alter):** the "polypad" wordmark uses gradient text:
```css
.text-gradient {
  -webkit-text-fill-color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  background: linear-gradient(349deg, #1a1740 0%, #f0f 57%, #238291 59%, #a60a0a 78%, #873636 100%, #27c2c2 100%);
}
```

**Typography**
- UI / display: **Space Grotesk** (400/500/600/700). Sizes used: 48 (landing logo), 21 (top logo), 15/14/13 (body & buttons), 11/12 (labels/meta). Letter-spacing −0.03 to −0.04em on the wordmark.
- Numeric / technical readouts: **JetBrains Mono** (400/500/600) — room names, coordinates, dimensions, status.

**Radius:** buttons/fields `10–12px`; panels/pills `14–18px`; landing card `20px`; avatars/dots full.

**Spacing:** panel insets 16px; section gaps 20px; field grid gap 8px; dock items `padding 9px 16px`.

**Shadows:** floating pills `0 12px 40px rgba(0,0,0,0.5)`; dock `0 16px 50px rgba(0,0,0,0.5)`; selection glow `drop-shadow(0 0 22px rgba(79,227,193,0.45))`.

**Backdrop blur:** 20–22px on all panels.

## Assets
- **Icons:** All icons are inline SVGs in the simple line style of the **Lucide** icon set (pointer, move, rotate-cw, maximize/scale, orbit/camera, box, cylinder, sphere, cone, plus, vertical-align, intersect/boolean, copy, group, trash, user-plus, download, minus, fit/maximize-corners). Use Lucide (or your codebase's existing icon library) to source equivalents — do not re-trace the SVGs by hand.
- **Fonts:** Google Fonts — Space Grotesk, JetBrains Mono.
- **3D:** the box is a CSS mock; implement the actual viewport with three.js / react-three-fiber (or the project's existing 3D layer).
- No raster images or external image assets are used.

## Files
- `Polypad 3D.dc.html` — the design reference (open in a browser to view; it relies on `support.js`). Both screens are in this one file; use the top-center Landing/Editor switcher to view each.
- `support.js` — the prototype runtime. **Reference only — do not ship.**
