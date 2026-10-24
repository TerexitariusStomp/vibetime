import FONT from '../../assets/geist-mono.woff2';

// The one stylesheet, font, icon set and script every page uses. DESIGN.md at
// the repo root explains the tokens and components; change them here, never in
// a page.

// The URL carries a fingerprint of the content, so a browser holding the old
// copy fetches the new one the moment it changes instead of a year later.
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

// The font never changes in place: ship a new file under a new name instead.
export const FONT_URL = '/assets/geist-mono.woff2';

export const SITE_CSS = `
:root {
  --bg: #0B0A0F; --surface-1: #13121A; --surface-2: #1B1924; --surface-3: #262330;
  --line: #24212E; --line-strong: #3A3548;
  --text: #EEECF4; --text-2: #ABA6BA; --text-3: #8C87A0;
  --accent: #A78BFA; --accent-fill: #A78BFA; --accent-fill-hover: #C4B5FD; --on-accent: #0B0A0F;
  --accent-wash: #1A1430; --accent-line: #3B2D63;
  --good: #4ADE80; --good-wash: #0E1F16; --good-line: #1D4030;
  --warn: #FBBF24; --warn-wash: #21190A; --warn-line: #4A3810;
  --bad: #F87171; --bad-wash: #24100F; --bad-line: #4D1F1D;
  --heat-0: #1D1B26; --heat-1: #3A2C66; --heat-2: #5B45B3; --heat-3: #8B6CF0; --heat-4: #C4B5FD;
  --seg-track: #13121A; --seg-on: #262330;
  --pod-top: #2E2A3A; --pod-front: #1F1C29; --pod-side: #16141E;
  --gem-1: #C4B5FD; --gem-2: #A78BFA; --gem-3: #7C3AED; --gem-4: #5B21B6;
  --on-crew: #0B0A0F;
  --font: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --r-2: 6px; --r-3: 10px; --r-full: 999px;
  --t-fast: 120ms; --t-slow: 320ms; --ease-out: cubic-bezier(.2, .8, .2, 1);
  color-scheme: dark;
}
:root[data-theme="light"] {
  --bg: #FBFAFD; --surface-1: #F4F2F8; --surface-2: #ECE9F2; --surface-3: #E1DDEA;
  --line: #E6E2EE; --line-strong: #CEC8DA;
  --text: #16141D; --text-2: #4D485C; --text-3: #6A657C;
  --accent: #6D28D9; --accent-fill: #7C3AED; --accent-fill-hover: #6D28D9; --on-accent: #FFFFFF;
  --accent-wash: #F1ECFE; --accent-line: #D8CBFA;
  --good: #166534; --good-wash: #EAF8EF; --good-line: #B9E3C8;
  --warn: #92580A; --warn-wash: #FDF6E3; --warn-line: #EED9A4;
  --bad: #C42B2B; --bad-wash: #FDF0EF; --bad-line: #F2C6C2;
  --heat-0: #ECE9F2; --heat-1: #DCD2FB; --heat-2: #B8A3F6; --heat-3: #8B6CF0; --heat-4: #6D28D9;
  --seg-track: #F4F2F8; --seg-on: #FFFFFF;
  --pod-top: #F1EEF6; --pod-front: #E4E0EC; --pod-side: #D4CEE0;
  color-scheme: light;
}
@font-face { font-family: "Geist Mono"; src: url(${FONT_URL}) format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }
@view-transition { navigation: auto; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 22px; -webkit-font-smoothing: antialiased; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
h1, h2 { margin: 0; font-weight: 600; text-wrap: balance; }
.wrap { width: 100%; max-width: 880px; margin: 0 auto; padding-inline: 24px; }
main.wrap { flex: 1; padding-bottom: 48px; }
.dim { color: var(--text-3); }

/* icons and the gem */
.i { width: 16px; height: 16px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; }
.gem { display: block; flex-shrink: 0; }
.gem path { transition: fill var(--t-slow) var(--ease-out); }
.gem .f1 { fill: var(--gem-1); } .gem .f2 { fill: var(--gem-2); } .gem .f3 { fill: var(--gem-3); } .gem .f4 { fill: var(--gem-4); }
.brand:hover .gem .f1 { fill: var(--gem-3); } .brand:hover .gem .f2 { fill: var(--gem-1); }
.brand:hover .gem .f3 { fill: var(--gem-4); } .brand:hover .gem .f4 { fill: var(--gem-2); }

/* top bar */
.nav { position: sticky; top: 0; z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); }
.nav-in { display: flex; align-items: center; gap: 20px; min-height: 56px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; letter-spacing: -0.02em; text-decoration: none; }
.places { display: flex; gap: 2px; }
.places a { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 10px; border-radius: var(--r-2); border: 1px solid transparent; color: var(--text-2); font-size: 13px; text-decoration: none; transition: background var(--t-fast), color var(--t-fast); }
.places a .i { display: none; }
.places a:hover { color: var(--text); background: var(--surface-1); }
.places a.on { color: var(--text); background: var(--surface-2); }
.account { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.account form { margin: 0; }
[data-theme="dark"] .i-moon, [data-theme="light"] .i-sun { display: none; }
/* While a tab's content loads, everything under the tabs dims, after a beat so
   a page that is already loaded never flickers. */
main > * { transition: opacity var(--t-fast); }
main[aria-busy="true"] > :not(.head):not(.tabs) { opacity: .5; transition-delay: 100ms; }
.menu { position: relative; }
.menu > summary { list-style: none; display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px 0 4px; border-radius: var(--r-full); cursor: pointer; color: var(--text-2); font-size: 13px; }
.menu > summary::-webkit-details-marker { display: none; }
.menu > summary:hover, .menu[open] > summary { background: var(--surface-1); color: var(--text); }
.menu .me { max-width: 16ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-pop { position: absolute; right: 0; top: calc(100% + 6px); min-width: 216px; padding: 6px; display: grid; gap: 2px; background: var(--surface-1); border: 1px solid var(--line-strong); border-radius: var(--r-3); z-index: 10; }
.menu-pop a, .menu-pop button { display: flex; align-items: center; gap: 10px; width: 100%; height: 36px; padding: 0 10px; border: 0; border-radius: var(--r-2); background: none; color: var(--text); font: inherit; font-size: 13px; text-align: left; text-decoration: none; cursor: pointer; }
.menu-pop a:hover, .menu-pop button:hover { background: var(--surface-2); }
.menu-pop .i { color: var(--text-3); }
.menu-who { margin: 0; padding: 6px 10px 8px; border-bottom: 1px solid var(--line); margin-bottom: 4px; color: var(--text-3); font-size: 12px; }
.menu-who b { color: var(--text); font-weight: 500; }

/* buttons and fields */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: var(--r-2); border: 1px solid var(--line-strong); background: var(--surface-1); color: var(--text); font: inherit; font-size: 13px; font-weight: 500; text-decoration: none; white-space: nowrap; cursor: pointer; transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform var(--t-fast); }
.btn:hover { background: var(--surface-2); }
.btn:active { transform: translateY(1px); }
.btn-primary { background: var(--accent-fill); border-color: transparent; color: var(--on-accent); font-weight: 600; }
.btn-primary:hover { background: var(--accent-fill-hover); }
.btn-ghost { background: transparent; border-color: transparent; color: var(--text-2); }
.btn-ghost:hover { background: var(--surface-1); color: var(--text); }
.btn-danger { color: var(--bad); }
.btn-danger:hover { background: var(--bad-wash); border-color: var(--bad-line); }
.btn-quiet, .btn-quiet:hover { background: transparent; color: var(--text-3); border-style: dashed; cursor: default; transform: none; }
.btn-sm { height: 28px; padding: 0 10px; font-size: 12px; gap: 6px; }
.btn-icon { width: 36px; padding: 0; }
.btn-block { width: 100%; height: 44px; font-size: 14px; }
form.inline { display: inline; margin: 0; }
.input { height: 40px; width: 100%; min-width: 0; padding: 0 12px; border-radius: var(--r-2); border: 1px solid var(--line-strong); background: var(--surface-1); color: var(--text); font: inherit; font-size: 14px; }
.input:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: var(--accent); }
.copy-done, .done .copy-idle { display: none; }
.done .copy-done { display: inline; }

/* page head and window switcher */
.head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 36px 0 24px; }
.head h1 { font-size: 22px; line-height: 28px; letter-spacing: -0.03em; }
.sub, .scale { margin: 6px 0 0; color: var(--text-2); font-size: 13px; line-height: 20px; }
.scale strong { color: var(--text); font-weight: 600; }
.scale .range { color: var(--text-3); }
.sub a, .def a, .fine a, .facts a { color: var(--text); text-decoration: underline; text-decoration-color: var(--line-strong); text-underline-offset: 3px; }
.sub a:hover, .def a:hover, .fine a:hover, .facts a:hover { text-decoration-color: currentColor; }
.tabs { display: inline-flex; gap: 2px; padding: 3px; background: var(--seg-track); border: 1px solid var(--line); border-radius: var(--r-3); }
.tab { display: inline-flex; align-items: center; justify-content: center; height: 30px; padding: 0 12px; border-radius: 7px; border: 1px solid transparent; color: var(--text-2); font-size: 13px; text-decoration: none; white-space: nowrap; transition: color var(--t-fast); }
.tab:hover { color: var(--text); }
.tab-active { background: var(--seg-on); border-color: var(--line-strong); color: var(--text); view-transition-name: tab-active; }
.back { display: inline-flex; align-items: center; gap: 6px; height: 32px; margin-top: 16px; color: var(--text-2); font-size: 13px; text-decoration: none; }
.back:hover { color: var(--text); }
.callout { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--r-3); background: var(--surface-1); color: var(--text-2); font-size: 13px; text-decoration: none; transition: border-color var(--t-fast), color var(--t-fast); }
.callout:hover { color: var(--text); border-color: var(--line-strong); }
.callout > .i:first-child { color: var(--accent); }
.callout .go { margin-left: auto; color: var(--text-3); }

/* avatars, monograms, tags, chips */
.av { display: block; flex-shrink: 0; border-radius: 50%; object-fit: cover; background: var(--surface-3); }
.mono { position: relative; overflow: hidden; display: inline-grid; place-items: center; flex-shrink: 0; width: 36px; height: 36px; border-radius: var(--r-2); color: var(--on-crew); font-weight: 700; font-size: 13px; letter-spacing: -0.02em; }
.mono::after { content: ""; position: absolute; inset: 0; background: rgb(0 0 0 / .16); clip-path: polygon(100% 38%, 100% 100%, 38% 100%); }
.mono-xl { width: 64px; height: 64px; font-size: 22px; border-radius: var(--r-3); }
.faces, .stack { display: inline-flex; align-items: center; }
.faces .face, .stack .av { box-sizing: content-box; border: 2px solid var(--bg); margin-left: -7px; }
.faces .face:first-child, .stack .av:first-child { margin-left: 0; }
.face, .top-face { width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; flex-shrink: 0; color: var(--on-crew); font-size: 9px; font-weight: 700; object-fit: cover; }
.faces .more, .stack .more { color: var(--text-3); font-size: 12px; margin-left: 6px; }
.tag { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: var(--r-full); border: 1px solid var(--line-strong); color: var(--text-2); font-size: 11px; font-weight: 500; line-height: 1; white-space: nowrap; vertical-align: middle; }
.tag .i { width: 11px; height: 11px; }
.tag-you { color: var(--accent); border-color: var(--accent-line); background: var(--accent-wash); }
.tag-open { color: var(--good); border-color: var(--good-line); background: var(--good-wash); }
.tag-left { color: var(--text-3); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 0; }
.chip { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 5px; border-radius: var(--r-full); border: 1px solid var(--line-strong); font-size: 13px; text-decoration: none; transition: border-color var(--t-fast); }
.chip:hover { border-color: var(--text-3); }
.chip .mono { width: 22px; height: 22px; border-radius: 50%; font-size: 9px; }
.chip-rank { color: var(--text-3); }
.live { position: relative; display: inline-block; width: 6px; height: 6px; margin-right: 6px; border-radius: 50%; background: var(--good); vertical-align: middle; }
.live::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--good); animation: live 2.4s var(--ease-out) infinite; }
@keyframes live { from { transform: scale(1); opacity: .7; } to { transform: scale(3.2); opacity: 0; } }

/* heat cells */
.heatmap { display: inline-flex; gap: 3px; vertical-align: middle; }
.cell { display: block; width: 10px; height: 10px; border-radius: 2px; background: var(--heat-0); animation: cell-in var(--t-slow) var(--ease-out) both; }
.cell:nth-child(2) { animation-delay: 30ms; } .cell:nth-child(3) { animation-delay: 60ms; } .cell:nth-child(4) { animation-delay: 90ms; }
.cell:nth-child(5) { animation-delay: 120ms; } .cell:nth-child(6) { animation-delay: 150ms; } .cell:nth-child(7) { animation-delay: 180ms; }
@keyframes cell-in { from { transform: scale(.4); opacity: .2; } }
.cell-1 { background: var(--heat-1); } .cell-2 { background: var(--heat-2); } .cell-3 { background: var(--heat-3); } .cell-4 { background: var(--heat-4); }
.heatmap-lg { gap: 4px; } .heatmap-lg .cell { width: 14px; height: 14px; border-radius: 3px; }
.legend { display: inline-flex; align-items: center; gap: 6px; }
.legend .cell { animation: none; }

/* ranked tables */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th { text-align: left; font-weight: 400; font-size: 12px; color: var(--text-3); padding: 0 8px 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
td { padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: middle; transition: background var(--t-fast); }
tbody tr:hover td { background: var(--surface-1); }
th.r, td.r { text-align: right; }
td.rank { width: 44px; text-align: right; color: var(--text-3); font-size: 13px; }
td.rank-top { color: var(--text); font-weight: 600; }
td.ships { width: 104px; text-align: right; color: var(--accent); font-size: 16px; line-height: 20px; font-weight: 600; letter-spacing: -0.02em; white-space: nowrap; }
td.ships small { display: block; color: var(--text-3); font-size: 12px; line-height: 16px; font-weight: 400; letter-spacing: 0; }
td.heat { width: 118px; }
td.last { width: 108px; text-align: right; color: var(--text-3); font-size: 12px; white-space: nowrap; }
.who { display: flex; align-items: center; gap: 10px; min-width: 0; text-decoration: none; }
.who-t { display: flex; flex-direction: column; min-width: 0; }
.who-l1 { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; }
.who .nm { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
a.who:hover .nm, .who a:hover .nm { color: var(--accent); }
.who .meta { color: var(--text-3); font-size: 12px; line-height: 16px; }
.meta-sm { display: none; }
.top { display: inline-flex; align-items: center; gap: 8px; color: var(--text-2); font-size: 13px; text-decoration: none; }
.top:hover { color: var(--text); }
div.who > a.who { flex: 1; }
.remove { flex-shrink: 0; padding: 4px 0; color: var(--text-3); font-size: 12px; text-decoration: none; }
.remove:hover { color: var(--bad); }
tr.you td, tbody tr.you:hover td { background: var(--accent-wash); border-top: 1px solid var(--accent-line); border-bottom-color: var(--accent-line); }
.empty { display: grid; justify-items: center; gap: 14px; padding: 40px 16px; text-align: center; color: var(--text-2); }
.empty b { color: var(--text); }
.board-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px 16px; margin-top: 14px; font-size: 12px; color: var(--text-3); }
.def { margin: 24px 0 0; max-width: 72ch; color: var(--text-2); font-size: 13px; line-height: 20px; }
.def b { color: var(--text); font-weight: 600; }

/* tiles, panels, settings */
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
.stat { min-width: 0; padding: 14px 16px; background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--r-3); }
.stat .v { font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.04em; }
.stat .l { margin-top: 2px; color: var(--text-2); font-size: 13px; }
.stat .s { margin-top: 2px; color: var(--text-3); font-size: 12px; line-height: 16px; }
.panel { min-width: 0; margin: 24px 0 0; background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--r-3); }
.panel-h { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.panel-h h2 { font-size: 14px; line-height: 22px; }
.panel-h span { color: var(--text-3); font-size: 12px; }
.panel-b { padding: 16px; display: grid; gap: 14px; }
.invite-line { display: flex; gap: 8px; }
.invite-line .input { flex: 1; height: 36px; color: var(--text-2); font-size: 13px; }
.tools .row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 24px; margin: 0; padding: 16px; border-top: 1px solid var(--line); }
.tools .panel-h + .row { border-top: 0; }
.tools .t { display: block; font-weight: 600; }
.tools .d { margin-top: 2px; color: var(--text-2); font-size: 13px; }
.tools .c { display: flex; flex-wrap: wrap; gap: 8px; }
.tools .c .input { width: auto; height: 36px; font-size: 13px; }
.tools .danger .t { color: var(--bad); }
.cmd { position: relative; min-width: 0; text-align: left; background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--r-3); }
.cmd pre { margin: 0; padding: 11px 48px 11px 14px; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; font-size: 13px; line-height: 22px; }
.cmd .ps { color: var(--text-3); user-select: none; }
.cmd .btn { position: absolute; top: 6px; right: 6px; }
.steps { display: grid; gap: 8px; justify-self: stretch; text-align: left; }
.steps .lbl { color: var(--text-2); font-size: 13px; }

/* notes, cards, forms */
.note { display: flex; align-items: flex-start; gap: 10px; margin: 16px 0 0; padding: 10px 12px; border: 1px solid; border-radius: var(--r-3); font-size: 13px; line-height: 20px; }
.note .i { margin-top: 2px; }
.note-good { background: var(--good-wash); border-color: var(--good-line); }
.note-good .i { color: var(--good); }
.note-bad { background: var(--warn-wash); border-color: var(--warn-line); }
.note-bad .i { color: var(--warn); }
.card { max-width: 440px; margin: 40px auto 0; padding: 28px; display: grid; gap: 16px; background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--r-3); }
.card.center { justify-items: center; text-align: center; }
.card h1 { font-size: 22px; line-height: 28px; letter-spacing: -0.03em; }
.card .note { margin: 0; justify-self: stretch; text-align: left; }
.card .stack .av { border-color: var(--surface-1); }
.divider { justify-self: stretch; height: 1px; background: var(--line); }
.facts { margin: 0; color: var(--text-2); font-size: 13px; line-height: 20px; }
.facts strong { color: var(--text); font-weight: 600; }
.invited { margin: 0; color: var(--text-3); font-size: 13px; }
.fine { margin: 0; color: var(--text-3); font-size: 12px; line-height: 18px; }
.field { display: grid; gap: 6px; }
.field label { color: var(--text-2); font-size: 13px; }
.field .hint { margin: 0; color: var(--text-3); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.field .hint b { color: var(--accent); font-weight: 500; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.card.center .actions { justify-content: center; }

/* profile */
.prof { display: flex; align-items: center; gap: 20px; padding-top: 16px; }
.prof > div { min-width: 0; }
.prof h1 { font-size: 28px; line-height: 34px; letter-spacing: -0.04em; overflow-wrap: anywhere; }
.prof .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; margin: 6px 0 0; color: var(--text-2); font-size: 13px; }
.prof .meta a { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
.prof .meta a:hover { color: var(--text); }
.rankline { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0 0; color: var(--text-3); font-size: 13px; }
.pill { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: var(--r-full); background: var(--accent-wash); border: 1px solid var(--accent-line); color: var(--accent); font-weight: 600; }

/* stats */
.statement { max-width: 34ch; margin: 56px 0 40px; font-size: 30px; line-height: 1.6; letter-spacing: -0.03em; text-wrap: pretty; }
.statement .num { padding: 0 8px; border-radius: var(--r-2); background: var(--accent-wash); color: var(--accent); font-weight: 600; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.defs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 32px; margin: 0; border-top: 1px solid var(--line); }
.defs div { padding: 14px 0; border-bottom: 1px solid var(--line); }
.defs dt { font-weight: 600; }
.defs dd { margin: 2px 0 0; color: var(--text-2); font-size: 13px; line-height: 20px; }
.notice { display: grid; justify-items: center; gap: 14px; max-width: 440px; margin: 0 auto; padding: 72px 0 40px; text-align: center; }
.notice h1 { font-size: 22px; line-height: 28px; }
.notice p { margin: 0; color: var(--text-2); }

/* footer */
.foot { border-top: 1px solid var(--line); padding-block: 20px 28px; color: var(--text-3); font-size: 12px; line-height: 18px; }
.foot-in { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px 24px; }
.foot-brand, .foot-links, .foot a { display: inline-flex; align-items: center; gap: 8px; }
.foot-links { flex-wrap: wrap; gap: 4px 16px; }
.foot a { color: var(--text-2); text-decoration: none; }
.foot a:hover { color: var(--text); }
.foot code { font: inherit; }

/* podium */
.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: 20px; max-width: 620px; margin: 8px auto 28px; padding: 0; list-style: none; }
.pod { grid-row: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.pod-1 { grid-column: 2; } .pod-2 { grid-column: 1; } .pod-3 { grid-column: 3; }
.pod-who { display: flex; flex-direction: column; align-items: center; gap: 8px; max-width: 100%; min-width: 0; text-decoration: none; }
.pod-who .nm { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.pod-who:hover .nm { color: var(--accent); }
.pod.you .av { outline: 2px solid var(--accent); outline-offset: 2px; }
.pod-n { color: var(--accent); font-size: 15px; font-weight: 600; }
.pod-n small { color: var(--text-3); font-size: 12px; font-weight: 400; }
.pod-block { --h: 56px; --top: var(--pod-top); position: relative; align-self: stretch; display: grid; place-items: center; height: var(--h); margin: 14px 12px 0 0; background: var(--pod-front); transform-origin: bottom; animation: rise 420ms steps(6, end) both; }
.pod-block::before { content: ""; position: absolute; left: 0; right: -12px; top: -8px; height: 8px; background: var(--top); clip-path: polygon(0 100%, 12px 0, 100% 0, calc(100% - 12px) 100%); }
.pod-block::after { content: ""; position: absolute; top: -8px; right: -12px; bottom: 0; width: 12px; background: var(--pod-side); clip-path: polygon(0 8px, 100% 0, 100% calc(100% - 8px), 0 100%); }
.pod-1 .pod-block { --h: 84px; --top: var(--accent); }
.pod-2 .pod-block { --h: 60px; animation-delay: 90ms; }
.pod-3 .pod-block { --h: 44px; animation-delay: 180ms; }
.pod-r { color: var(--text-3); font-size: 22px; font-weight: 600; letter-spacing: -0.03em; }
.pod-1 .pod-r { color: var(--accent); }
@keyframes rise { from { transform: scaleY(.15); } }
/* Your row stays in view at the bottom until you scroll to where it is. */
.board tr.you td { position: sticky; bottom: 0; }

/* home */
.hero { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 48px; align-items: center; padding: 64px 0 48px; }
.display { font-size: 48px; line-height: 52px; letter-spacing: -0.05em; }
.lead { margin: 20px 0 28px; max-width: 46ch; color: var(--text-2); font-size: 15px; line-height: 24px; }
.hero-term { display: grid; gap: 12px; }
.endcard { margin: 0; overflow: hidden; background: var(--surface-1); border: 1px solid var(--line-strong); border-radius: var(--r-3); font-size: 13px; }
.endcard-h { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); color: var(--text-2); }
.endcard-h b { color: var(--text); font-weight: 600; }
.endcard-b { display: grid; gap: 16px; padding: 20px 16px; }
.endcard .plus { color: var(--good); } .endcard .minus { color: var(--bad); }
.endcard-tier { display: flex; align-items: center; gap: 12px; font-weight: 600; }
.endcard-tier .i { color: var(--accent); }
.mbar { display: inline-flex; gap: 3px; vertical-align: middle; }
.mbar i { display: block; width: 10px; height: 10px; border-radius: 2px; background: var(--heat-0); }
.mbar i.on { background: var(--accent); }
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: var(--surface-1); border: 1px solid var(--line); border-radius: var(--r-3); text-decoration: none; transition: border-color var(--t-fast); }
.kpis:hover { border-color: var(--line-strong); }
.kpi { display: grid; min-width: 0; padding: 14px 16px; border-left: 1px solid var(--line); }
.kpi:first-child { border-left: 0; }
.kpi .v { font-size: 20px; line-height: 26px; font-weight: 600; letter-spacing: -0.03em; }
.kpi .l { color: var(--text-3); font-size: 12px; }
.sec-h { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 40px 0 12px; }
.sec-h h2 { font-size: 16px; line-height: 24px; letter-spacing: -0.02em; }
.sec-h a { display: inline-flex; align-items: center; gap: 6px; color: var(--text-2); font-size: 13px; text-decoration: none; }
.sec-h a:hover { color: var(--text); }
.sec-h + .panel { margin-top: 0; }
.split { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 24px; }
.mini { margin: 0; padding: 0; list-style: none; }
.mini li { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--line); }
.mini li:first-child { border-top: 0; }
.mini .rk { color: var(--text-3); font-size: 13px; text-align: right; }
.mini .n { color: var(--accent); font-weight: 600; }
.mini .mono { width: 24px; height: 24px; border-radius: 5px; font-size: 10px; }
.mini-empty { margin: 0; padding: 16px; color: var(--text-2); font-size: 13px; }
.tiers td { padding: 12px 16px; vertical-align: top; }
.tiers tr:last-child td { border-bottom: 0; }
.tiers td:first-child { width: 128px; padding-top: 15px; }
.tn { font-weight: 600; } .tn-on { color: var(--accent); }
.tm { display: block; color: var(--text-2); font-size: 13px; }
.trio { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.trio > div { display: grid; align-content: start; gap: 4px; color: var(--text-2); font-size: 13px; }
.trio b { display: flex; align-items: center; gap: 8px; color: var(--text); font-size: 14px; font-weight: 600; }
.trio .i { color: var(--accent); }

@media (max-width: 640px) {
  .hero { grid-template-columns: minmax(0, 1fr); gap: 28px; padding: 28px 0 24px; }
  .display { font-size: 34px; line-height: 40px; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kpi:nth-child(3) { border-left: 0; }
  .kpi:nth-child(n+3) { border-top: 1px solid var(--line); }
  .split, .trio { grid-template-columns: minmax(0, 1fr); }
  .split { gap: 0; }
  .sec-h { margin-top: 32px; }
  .podium { gap: 10px; margin-bottom: 20px; }
  .pod-who .nm { font-size: 13px; }
  .pod-n small { display: none; }
  .pod-block { margin-right: 8px; }
  .pod-block::before { right: -8px; top: -6px; height: 6px; clip-path: polygon(0 100%, 8px 0, 100% 0, calc(100% - 8px) 100%); }
  .pod-block::after { right: -8px; top: -6px; width: 8px; clip-path: polygon(0 6px, 100% 0, 100% calc(100% - 6px), 0 100%); }
  .pod-1 .pod-block { --h: 64px; } .pod-2 .pod-block { --h: 46px; } .pod-3 .pod-block { --h: 34px; }
  .pod-r { font-size: 18px; }
  .wrap { padding-inline: 16px; }
  .nav { position: static; }
  .nav-in { flex-wrap: wrap; gap: 10px 12px; padding-block: 10px 12px; }
  .places { order: 3; flex-basis: 100%; gap: 4px; padding: 4px; background: var(--seg-track); border: 1px solid var(--line); border-radius: var(--r-3); }
  .places a { flex: 1 1 auto; height: 40px; padding: 0 8px; border-radius: 7px; }
  .places a .i { display: inline; }
  .places a.on { background: var(--seg-on); border-color: var(--line-strong); }
  .menu .me, .menu .chev { display: none; }
  .head { padding: 20px 0 16px; }
  .head > div:first-child { flex-basis: 100%; }
  .tabs { display: flex; width: 100%; }
  .tab { flex: 1; height: 36px; padding: 0 6px; }
  .head h1 { font-size: 20px; }
  .hide-sm { display: none; }
  th { display: none; }
  td { padding: 12px 4px; }
  td:nth-child(2) { width: 100%; max-width: 0; }
  td.rank { width: 30px; padding-left: 0; }
  td.ships { width: 1%; padding-right: 0; }
  .meta-sm { display: flex; align-items: center; gap: 8px; margin-top: 3px; color: var(--text-3); font-size: 12px; line-height: 16px; }
  .meta-sm .heatmap { gap: 2px; }
  .meta-sm .cell { width: 8px; height: 8px; }
  .stats { gap: 8px; margin: 20px 0; }
  .stat { padding: 12px; }
  .stat .v { font-size: 22px; line-height: 28px; }
  .stat .l { font-size: 12px; }
  .prof { gap: 14px; align-items: flex-start; }
  .prof > .av { width: 56px; height: 56px; }
  .prof h1 { font-size: 22px; line-height: 28px; }
  .crew-head .mono-xl { width: 52px; height: 52px; font-size: 18px; }
  .crew-head .access { flex-basis: 100%; justify-items: stretch; }
  .crew-head .access .btn, .crew-head .access form { width: 100%; }
  .card { margin-top: 24px; padding: 22px 18px; }
  .tools .c, .tools .c .input { flex: 1; }
  .statement { margin: 32px 0 28px; font-size: 22px; }
  .defs { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 359px) {
  .places a .i { display: none; }
}
.crew-head { align-items: center; }
.crew-head .who { gap: 18px; }
.crew-head h1 { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 28px; line-height: 34px; letter-spacing: -0.04em; }
.access { display: grid; justify-items: end; gap: 6px; font-size: 12px; color: var(--text-3); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  @view-transition { navigation: none; }
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
`;

export const SITE_CSS_URL = `/assets/site.css?v=${fingerprint(SITE_CSS)}`;

// Mirrors slugFor for the preview only; the server decides the real address.
export const COPY_SCRIPT = `document.addEventListener('input', function (e) {
  if (!e.target || e.target.id !== 'crew-name') return;
  var out = document.getElementById('slug-preview');
  if (!out) return;
  var slug = e.target.value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32).replace(/-+$/, '');
  out.textContent = out.getAttribute('data-host') + '/crew/' + (slug || '…');
});
document.addEventListener('click', function (e) {
  var menu = document.querySelector('details.menu[open]');
  if (menu && !menu.contains(e.target)) menu.removeAttribute('open');
  var b = e.target.closest && e.target.closest('[data-copy]');
  if (!b) return;
  var done = function () { b.classList.add('done'); setTimeout(function () { b.classList.remove('done'); }, 2000); };
  var fallback = function () { var i = document.getElementById('invite-link'); if (i) { i.focus(); i.select(); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, fallback); else fallback();
});
document.addEventListener('keydown', function (e) {
  var menu = document.querySelector('details.menu[open]');
  if (e.key === 'Escape' && menu) { menu.removeAttribute('open'); menu.querySelector('summary').focus(); }
});
// Window tabs and the theme switch work without a page load. Without this
// script they are a plain link and a plain form, and still work.
// A tab's page starts loading when the pointer or focus reaches it, and stays
// for a minute, so most switches have nothing left to wait for.
var pages = {};
function load(url) {
  var hit = pages[url];
  if (hit && Date.now() - hit.at < 60000) return hit.page;
  var page = fetch(url).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  });
  pages[url] = { at: Date.now(), page: page };
  page.catch(function () { delete pages[url]; });
  return page;
}
function tabAt(e) { return e.target.closest && e.target.closest('.tabs a'); }
['pointerover', 'focusin'].forEach(function (type) {
  document.addEventListener(type, function (e) { var a = tabAt(e); if (a && a.href !== location.href) load(a.href); });
});
var wanted = null;
function swap(url, push, tab) {
  var main = document.querySelector('main');
  wanted = url;
  // The tab moves the moment it is pressed; the content follows when it lands.
  // No view transition here: its snapshot holds the click up for a frame or more.
  if (tab) tab.parentNode.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('tab-active', t === tab); });
  main.setAttribute('aria-busy', 'true');
  if (push) history.pushState(null, '', url);
  load(url).then(function (html) {
    if (url !== wanted) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    ['.nav', 'main'].forEach(function (sel) { var el = doc.querySelector(sel); if (el) document.querySelector(sel).replaceWith(el); });
    document.title = doc.title;
  }).catch(function () { location.href = url; });
}
document.addEventListener('click', function (e) {
  var a = tabAt(e);
  if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (a.href !== location.href) swap(a.href, true, a);
});
window.addEventListener('popstate', function () { swap(location.href, false); });
document.addEventListener('submit', function (e) {
  if (e.target.getAttribute('action') !== '/theme') return;
  e.preventDefault();
  var button = e.target.querySelector('button[name="theme"]');
  var next = button.value, other = next === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  button.value = other;
  button.setAttribute('aria-label', 'switch to ' + other);
  fetch('/theme', { method: 'POST', body: new URLSearchParams({ theme: next, next: '/' }), redirect: 'manual' });
});
`;
export const COPY_SCRIPT_URL = `/assets/copy.js?v=${fingerprint(COPY_SCRIPT)}`;

// Line icons: a 20px grid, 1.5px stroke, round caps, colored by currentColor.
const ICONS = {
  trophy: '<path d="M6.5 3.5h7V7a3.5 3.5 0 0 1-7 0z"/><path d="M6.5 5h-2a2 2 0 0 0 2 3.2M13.5 5h2a2 2 0 0 1-2 3.2"/><path d="M10 10.5v3M7 16.5h6M8.25 16.5l.5-3h2.5l.5 3"/>',
  users: '<circle cx="7.5" cy="7" r="2.75"/><path d="M2.75 16c.6-2.6 2.5-4 4.75-4s4.15 1.4 4.75 4"/><path d="M12.5 4.6a2.6 2.6 0 0 1 0 4.8M14.5 12.2c1.4.6 2.4 1.9 2.75 3.8"/>',
  chart: '<path d="M3.5 16.5h13M5.75 13.5v-3M10 13.5V6M14.25 13.5v-5"/>',
  user: '<circle cx="10" cy="7" r="3"/><path d="M4 16.5c.8-3 3.1-4.5 6-4.5s5.2 1.5 6 4.5"/>',
  'arrow-left': '<path d="M16 10H4M8.5 5.5 4 10l4.5 4.5"/>',
  'arrow-right': '<path d="M4 10h12M11.5 5.5 16 10l-4.5 4.5"/>',
  'chevron-down': '<path d="M5.5 8 10 12.5 14.5 8"/>',
  copy: '<rect x="7" y="7" width="9.5" height="9.5" rx="2"/><path d="M13 7V5a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 0 4 5v6a1.5 1.5 0 0 0 1.5 1.5H7"/>',
  check: '<path d="M4 10.5 8 14.5 16 6"/>',
  plus: '<path d="M10 4v12M4 10h12"/>',
  lock: '<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
  globe: '<circle cx="10" cy="10" r="6.75"/><path d="M3.25 10h13.5M10 3.25c-2.2 2-2.2 11.5 0 13.5M10 3.25c2.2 2 2.2 11.5 0 13.5"/>',
  'log-out': '<path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3M12.5 13.5 16 10l-3.5-3.5M16 10H7.5"/>',
  link: '<path d="M8.5 11.5l3-3M9 6.5l1-1a3 3 0 0 1 4.25 4.25l-1 1M11 13.5l-1 1a3 3 0 0 1-4.25-4.25l1-1"/>',
  alert: '<path d="M10 3.5 17.25 16H2.75z"/><path d="M10 8.5v3.25M10 14v.01"/>',
  'circle-check': '<circle cx="10" cy="10" r="6.75"/><path d="M7 10.25 9 12.25 13 8"/>',
  spark: '<path fill="currentColor" stroke="none" d="M10 2.5C10.6 7 13 9.4 17.5 10 13 10.6 10.6 13 10 17.5 9.4 13 7 10.6 2.5 10 7 9.4 9.4 7 10 2.5Z"/>',
  commit: '<circle cx="10" cy="10" r="3"/><path d="M2.75 10H7M13 10h4.25"/>',
  sun: '<circle cx="10" cy="10" r="3.25"/><path d="M10 2.75v1.5M10 15.75v1.5M2.75 10h1.5M15.75 10h1.5M4.87 4.87l1.06 1.06M14.07 14.07l1.06 1.06M4.87 15.13l1.06-1.06M14.07 5.93l1.06-1.06"/>',
  moon: '<path d="M10 2.5a5 5 0 0 0 7.5 7.5 7.5 7.5 0 1 1-7.5-7.5Z"/>',
  github: '<path fill="currentColor" stroke="none" transform="translate(2 2)" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>',
} as const;
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = ''): string {
  return `<svg class="i${cls ? ` ${cls}` : ''}" viewBox="0 0 20 20" aria-hidden="true">${ICONS[name]}</svg>`;
}

// The ◆ as an octahedron seen from just above: four flat facets lit from the
// top left. The same paths draw the favicon and logo.svg.
export const GEM_PATHS = '<path class="f1" d="M32 4 4 30 28 34Z"/><path class="f2" d="M32 4 28 34 60 30Z"/><path class="f3" d="M4 30 32 60 28 34Z"/><path class="f4" d="M28 34 32 60 60 30Z"/>';
export function gem(size: number): string {
  return `<svg class="gem" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${GEM_PATHS}</svg>`;
}

const ASSET_HEADERS = { 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' };

export function stylesheetResponse(): Response {
  return new Response(SITE_CSS, { headers: { 'content-type': 'text/css; charset=utf-8', ...ASSET_HEADERS } });
}

export function copyScriptResponse(): Response {
  return new Response(COPY_SCRIPT, { headers: { 'content-type': 'text/javascript; charset=utf-8', ...ASSET_HEADERS } });
}

export function fontResponse(): Response {
  return new Response(FONT, { headers: { 'content-type': 'font/woff2', ...ASSET_HEADERS } });
}
