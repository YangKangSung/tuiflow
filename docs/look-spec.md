# Look spec — the "terminal diagram" style

Reference: [X video (eng_khairallah1, 2026-10-04)](https://x.com/eng_khairallah1/status/2106852012558266388/video/1) —
a 24-second clip that shows a "Claude Code agent tree" as an animated diagram inside a terminal window (`~/agent-tree · zsh · 90x46`).
The video itself is copyrighted, so it is not stored here. Only the elements that make up the look are listed below. This document is the shared standard for every target (Grafana panel, VS Code webview, presentation HTML).

## 1. Canvas

| Item | Value |
|---|---|
| Grid | 90×46 cells (the video). The demo is 100×36 |
| Font | One monospace face that covers box drawing (U+2500–257F), blocks (U+2580–259F), and `╌ ┆ ▶ ▼` — JetBrains Mono, Cascadia Mono, Fira Code, DejaVu Sans Mono |
| Size / leading | 12.5–13px, line-height 1.25 (cell ratio ≈ 0.6 : 1.25) |
| Background | Dark charcoal `#0f1218` (not pure black). Window chrome: ●●● traffic lights at the top left, title centered |
| Corners | None (radius 0) |

## 2. Glyph vocabulary

| Role | Glyphs | Notes |
|---|---|---|
| Box border (dashed) | `┌ ┐ └ ┘` + `╌` (horizontal) `┆` (vertical) | The video's main node style. `tf.box(..., {style:"dashed"})` |
| Box border (solid) | `┌ ┐ └ ┘ ─ │` | Secondary panels and the log area |
| Connection | `╌╌╌╌` + arrowheads `▶ ▼ ◀` | Corners turn with `┐ └ ┘` |
| Packet | `.o@` (`@` leads in the direction of travel) / reverse `@o.` | 3 cells, about one cell per frame at 8 fps |
| Horizontal bar | `█` fill + `░` empty; the last cell uses `▏▎▍▌▋▊▉` for 1/8 precision | `tf.bar(ratio, width)` |
| Sparkline | `▁▂▃▄▅▆▇█` | `tf.sparkline(values, {width})` |
| Status tag | `[ok returned]` `[plan mode]` `[ready]` | Brackets + lowercase, color by meaning |
| Divider | `┄┄┄ title ┄┄┄` | Section header (session log and similar) |
| Status line | ` key:[value]  key:[value] ` | tmux style, background one step lighter |

## 3. Color (video palette)

| Token | Value | Use |
|---|---|---|
| fg | `#c9ced6` | Default text |
| dim | `#5c6370` | Labels, secondary copy, status-line text |
| border | `#3a4150` | Boxes and dividers |
| orange | `#e8a06a` | Primary accent (the video's "opus"), packets, the default bar |
| blue | `#8fb3ff` | Secondary (the video's "sonnet") |
| green | `#86d28a` | Healthy / workload (the video's "jev") |
| gray | `#9aa0a6` | Idle / observer (the video's "fable") |
| red | `#e06c75` | Warning and error bars |
| status-bg | `#171b23` | Status-line background |

Variant palettes: `matrix` (black + `#00c017`/`#00ff41`, the same family as Grafana's hidden theme), `amber` (`#0a0700` + `#ffb000`). The CRT overlay (scanlines, vignette, glow, a slight flicker) is optional.

## 4. Layout rules

1. A node is a fixed-width box (26 cells in the demo). The title is set into the top border as `┌ title ╌╌┐`.
2. One line inside a box is `label(5) bar(8–14) value(right-aligned 5–7)`. Keep the value width fixed so line length does not jitter.
3. A horizontal connection uses the whole gap between boxes (8–12 cells). A vertical connection uses the box's center column.
4. Packet speed is proportional to the data (rps and similar). At value 0, drop the packet and leave the dashed line.
5. The bottom third is a log table (time · actor · message) plus a status line on the last row.
6. Every element is a string. Color is applied only as `<span class>` at HTML render time, so `toText()` pastes straight into a slide or a README.

## 5. Animation

| Target | Behavior | Cadence |
|---|---|---|
| Packet | Move one cell per tick, wrap at the end | At 8 fps |
| Bars / values | Replace immediately when data updates (no interpolation; that is the terminal) | Data interval |
| Log | Stack top to bottom, newest on top | On each event |
| Cursor / blink | Toggle a `█` block cursor at the end of the status line | 1 Hz |

## 6. Per-target mapping

| Target | Render path |
|---|---|
| Standalone HTML (presentation) | `demo/index.html` — `tf.Screen` → `<pre>` innerHTML |
| Grafana | Business Text panel: Handlebars template + `before.js` helpers + `after.js` animation. The rest of the UI uses `?theme=matrix` |
| VS Code | The same `tuiflow.js` in a webview panel, colors mapped from theme tokens (`--vscode-*`) (planned) |
