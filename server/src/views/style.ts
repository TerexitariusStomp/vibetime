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
  --gem-1: #C4B5FD; --gem-2: #A78BFA; --gem-3: #7C3AED; --gem-4: #5B21B6;
  --on-crew: #0B0A0F;
  --font: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --r-2: 6px; --r-3: 10px; --r-full: 999px;
  --t-fast: 120ms; --t-slow: 320ms; --ease-out: cubic-bezier(.2, .8, .2, 1);
  color-scheme: dark;
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

@media (max-width: 640px) {
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
