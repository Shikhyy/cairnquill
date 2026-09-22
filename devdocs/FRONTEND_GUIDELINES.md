# Cairnquill: Frontend UI Guidelines

**Direction:** modern and calm, in the spirit of Apple's design language (light surfaces, generous space, large confident type, soft depth, spring motion). Inspired by, not a copy of, any company's proprietary design.

**Audience:** compliance professionals who read dense information under deadline, and hackathon judges who decide in minutes.

**Job of the interface:** make *trust* visible. Every claim shows whether it was checked and against what.

**One memorable thing:** the **cairn stack**. Each verified claim lands as a small stone on a stack with a quick spring. A contradicted claim makes its stone wobble in amber and the stack will not complete. Everything else stays quiet.

---

## 1. Design tokens

### Colour (light first, dark supported)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#F4F4F6` | `#0B0B0D` | Page background |
| `--surface` | `#FFFFFF` | `#1A1A1D` | Cards, panels |
| `--surface-2` | `#EDEDF0` | `#242428` | Wells, code blocks |
| `--ink` | `#1C1C1E` | `#F2F2F4` | Primary text |
| `--ink-2` | `#5C5C63` | `#A1A1A8` | Secondary text |
| `--hairline` | `#D9D9DE` | `#34343A` | Borders and dividers |
| `--accent` | `#0A6CFF` | `#4C9AFF` | Primary actions, links, focus |
| `--verified` | `#1F8A4C` | `#34D27B` | Verified claims |
| `--contradicted` | `#C2410C` | `#FF9F43` | Contradicted claims, block |
| `--unsupported` | `#6B6B73` | `#9A9AA2` | Unsupported claims (dashed outline) |
| `--judgement` | `#5B4FD9` | `#8E86FF` | Analyst judgement |
| `--danger` | `#C0262D` | `#FF6B72` | Tamper or hash mismatch only |

Rules:
- Meaning is never carried by colour alone. Pair every state with an icon and a label (checkmark, warning triangle, dashed outline, quote mark).
- Contrast must meet WCAG AA. Check text on `--surface-2`.
- No decorative gradients. No colour washes behind sections.

### Typography

| Role | Stack |
|---|---|
| UI and display | `"SF Pro Display", "SF Pro Text", -apple-system, "Segoe UI Variable", "Geist", system-ui, sans-serif` |
| Code and IDs | `"SF Mono", "Geist Mono", "JetBrains Mono", ui-monospace, monospace` |

SF Pro appears on Apple devices; Geist is the open fallback elsewhere. Self-host Geist (variable) so the look is consistent.

| Style | Size / line | Weight | Tracking |
|---|---|---|---|
| Display | 56 / 60 | 600 | -0.03em |
| Title 1 | 34 / 40 | 600 | -0.02em |
| Title 2 | 24 / 30 | 600 | -0.01em |
| Headline | 17 / 24 | 600 | 0 |
| Body | 15 / 22 | 400 | 0 |
| Caption | 13 / 18 | 400 | 0 |
| Code | 13 / 20 | 400 | 0 |

- Keep line length under 80 characters.
- Use tabular numerals (`font-variant-numeric: tabular-nums`) for amounts and counts.
- Sentence case everywhere. No ALL-CAPS labels. No spaced em-dash label patterns.

### Radius, depth, spacing

| Token | Value | Used for |
|---|---|---|
| `--r-control` | 10px | Buttons, inputs, chips |
| `--r-card` | 20px | Cards and panels |
| `--r-sheet` | 28px | Drawers, modals |
| `--r-pill` | 999px | Status pills |
| `--shadow-1` | `0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .06)` | Cards (light) |
| `--shadow-2` | `0 2px 4px rgb(0 0 0 / .06), 0 20px 48px rgb(0 0 0 / .12)` | Drawers, menus |

In dark mode, rely on surface contrast and hairlines, not shadow.

Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Page gutters 24px on phone, 48px on desktop. Content max-width 1200px.

### Glass

The top bar is the only glass element: `background: rgb(255 255 255 / .72)` (light) or `rgb(26 26 29 / .72)` (dark), `backdrop-filter: saturate(180%) blur(20px)`, bottom hairline. Provide a solid fallback when `backdrop-filter` is unsupported.

### Tailwind tokens (sketch)

```ts
// tailwind.config.ts
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: { extend: {
    colors: {
      canvas: "var(--canvas)", surface: "var(--surface)", "surface-2": "var(--surface-2)",
      ink: "var(--ink)", "ink-2": "var(--ink-2)", hairline: "var(--hairline)",
      accent: "var(--accent)", verified: "var(--verified)", contradicted: "var(--contradicted)",
      unsupported: "var(--unsupported)", judgement: "var(--judgement)", danger: "var(--danger)",
    },
    borderRadius: { control: "10px", card: "20px", sheet: "28px" },
    boxShadow: { 1: "var(--shadow-1)", 2: "var(--shadow-2)" },
    fontFamily: { sans: ["var(--font-ui)"], mono: ["var(--font-mono)"] },
  }},
};
```

## 2. Layout

Top glass bar with the product name, primary tabs (Queue, Filings, Eval, Ask), role switcher and a theme toggle. Content is centred, left-aligned, with generous vertical rhythm. No persistent sidebar; the case screen uses a two-pane split instead.

### Queue

```
┌ Cairnquill   Queue  Filings  Eval  Ask               [Role ▾] [☾] ┐
│                                                                    │
│  Alerts                                      [Typology ▾] [SLA ▾]  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Account 12:8F3A…   Cycle      score 0.94   ◔ 5 days left    │  │
│  │ Account 07:1C20…   Fan-out    score 0.91   ◔ 1 day left     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Case (two panes)

```
┌ Evidence ─────────────────────────┬ Report ────────────────────────┐
│  [ subgraph canvas ]              │  Draft v2        ▓▓▓░ 3/4     │
│                                   │  ● Account X paid 1,250,000 USD│
│  KYC            Pattern           │    across 6 accounts           │
│  Declared ...   Cycle · 72h       │  ▲ Sum mismatch: 1,375,000     │
│                                   │    actual 1,250,000   [Repair] │
└───────────────────────────────────┴────────────────────────────────┘
```

Left pane scrolls independently of the right. On phones the panes stack with a segmented control (Evidence | Report).

### Filing

A single reading column (max 720px) with each sentence as an interactive span. Selecting a sentence opens an evidence drawer from the right (sheet radius, `--shadow-2`).

### Eval

One large result card per metric group, each with a short sentence of meaning and the with/without comparison as a pair of bars. A single **Run planted-error suite** button.

## 3. Components

| Component | Spec |
|---|---|
| Button, primary | `--accent` fill, white text, `--r-control`, 44px min height, no shadow |
| Button, secondary | `--surface-2` fill, `--ink` text |
| Button, destructive | `--danger` text on surface, confirmation required |
| Chip / status pill | Pill radius, icon plus label, 13px |
| Claim card | Surface, `--r-card`, left status marker (icon), claim text, mono evidence IDs, "Show evidence" link |
| Evidence drawer | Slides from right, shows rows, query, and tolerance used |
| Cairn stack | Vertical stack of 3 to 8 rounded stones, one per claim; see motion |
| SLA ring | Small circular progress with days left; warning state under 24h |
| Seal badge | Mono hash prefix (first 12 chars), copy button, match or mismatch state |
| Toast | Bottom centre, one line, auto-dismiss 4s, same verb as the action |
| Empty state | One sentence saying what to do, one primary button |
| Skeleton | Used instead of spinners for lists and cards |

### Claim states

| State | Icon | Label | Style |
|---|---|---|---|
| Verified | Checkmark in circle | Verified | `--verified` marker |
| Contradicted | Warning triangle | Doesn't match | `--contradicted` marker, shows asserted vs actual |
| Unsupported | Dashed circle | No evidence found | `--unsupported`, dashed outline |
| Judgement | Quote mark | Analyst judgement | `--judgement` marker |

## 4. Motion

| Moment | Behaviour |
|---|---|
| Claim verifies | Stone drops onto the stack with a spring (stiffness ~300, damping ~30), ~350ms |
| Claim contradicted | Stone wobbles twice in amber and stops; banner "Draft blocked" slides in |
| Stack completes | One soft scale pulse on the stack and the **Submit** button enables |
| Drawer, modal | Slide and fade, 250ms, `cubic-bezier(.2,.8,.2,1)` |
| Hover, press | Subtle brightness or scale to 0.98 on press only |
| Page load | One orchestrated reveal on the queue, nothing else |

Rules:
- Motion answers a user action or a state change. No scroll-triggered fade-ups. No hover animations on every card.
- Respect `prefers-reduced-motion`: replace springs with instant state changes and keep the icons and labels.

## 5. Copy

- Sentence case, plain verbs, active voice. Name things by what the user sees.
- Buttons say what happens: **Mine evidence**, **Draft report**, **Repair claims**, **Submit for approval**, **Approve**, **Replay**.
- Keep one verb per action across button, toast and log: "Approved" follows **Approve**.
- Errors say what happened and how to fix it. They do not apologise.
  - Good: "Draft blocked. One claim doesn't match the data. Review it or repair claims."
  - Bad: "Oops, something went wrong."
- Empty states invite action: "No alerts yet. Run the detector to create some."
- Always show a notice: "Synthetic data. Not for real filing."
- Never generate or display customer-facing messages. Show the tipping-off notice on drafting screens.

## 6. Accessibility

- Minimum target size 44px. Visible focus ring: 2px `--accent` outline with 2px offset.
- Full keyboard path through queue → case → draft → approve.
- ARIA live region announces verification results ("3 of 4 claims verified").
- Colour is never the only signal. Check in grayscale.
- Screen reader text for the cairn stack: "3 of 4 claims verified, 1 doesn't match".

## 7. Responsive

| Breakpoint | Behaviour |
|---|---|
| < 640px | Single column, panes stacked with a segmented control |
| 640 to 1024px | Single column, drawer full-width sheet |
| > 1024px | Two-pane case view |

Test at 375, 768, 1280 and 1600px.

## 8. Graph view

- Cytoscape.js, nodes are accounts (rounded squares), edges are transactions (arrows weighted by amount).
- Flagged account is highlighted with `--accent` ring; pattern members use `--ink` fill; other nodes use `--surface-2`.
- Show amounts on hover or focus, not by default.
- Cap at 30 nodes; offer "Show more" beyond that.

## 9. Do and don't

| Do | Don't |
|---|---|
| Large type, whitespace, one accent colour | Gradient washes, glow, neon |
| Vary radius by hierarchy (control, card, sheet) | One radius on everything |
| Show evidence next to every claim | Hide proof behind a menu |
| Use skeletons | Full-screen spinners |
| One memorable animation (the cairn stack) | Animate every card |
| Tabular numerals for money | Proportional digits in tables |
| Real, specific copy | Lorem ipsum, "Welcome back!" |

## 10. Definition of done for UI

- [ ] Light and dark both checked
- [ ] Keyboard path works end to end
- [ ] Reduced motion works
- [ ] 375px layout has no horizontal scroll
- [ ] Every state (loading, empty, error, blocked, ready) designed
- [ ] Synthetic-data notice present
- [ ] Inject-error moment runs in under 20 seconds and reads clearly

## 11. Landing site

The marketing site is a separate artefact and uses a dark, terminal-flavoured look. If time allows, align its verified green and amber with the app tokens above.
