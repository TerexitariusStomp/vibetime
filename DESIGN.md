# DESIGN.md

How vibetime.club looks, and how to keep it that way when you add to it.

The site is server-rendered HTML from `server/src/views`. Every page goes
through `renderPage()` in `views/layout.ts` and shares one stylesheet, one
script and one font, all built in `views/style.ts`:

| What | Served at | Source |
|---|---|---|
| stylesheet | `/assets/site.css?v=<hash>` | `SITE_CSS` |
| script (copy buttons, menu, slug preview, tabs and theme switch without a page load) | `/assets/copy.js?v=<hash>` | `COPY_SCRIPT` |
| font, Geist Mono variable (OFL) | `/assets/geist-mono.woff2` | `server/assets/` |
| icons | inline `<svg>` | `ICONS`, `icon()` |
| the gem | inline `<svg>`, `/favicon.svg` | `gem()`, `views/favicon.ts` |

The stylesheet and script URLs carry a hash of their content, so they cache for
a year and still update the moment they change. Pages send `PAGE_CSP` from
`http.ts`: everything comes from the site itself, avatars from GitHub. Do not
add inline `<script>`, a CDN, or a second font.

## Principles

1. **The endcard, expanded.** One monospace face, lowercase copy, the `◆`
   gem. The site should feel like the card the CLI prints when you ship.
2. **Violet means shipped.** The accent is for ship counts, heat cells, the
   gem, the primary button and "you". Headings, links and tabs stay neutral.
3. **Numbers first.** The count is large and comes first; its context sits
   under it in a quieter color.
4. **Thumb-ready.** Every page works at 320px wide with no sideways scroll.
   Nothing important hides behind hover.
5. **Fast by default.** No framework, no client rendering, CSS-only motion,
   no layout shift.

## Tokens

Every color is a custom property on `:root` (dark, the default) and
`:root[data-theme="light"]`. Components never use a literal color; if you need
a new one, add a token to both themes.

| Group | Tokens | Use |
|---|---|---|
| surfaces | `--bg` `--surface-1` `--surface-2` `--surface-3` | page, panels, raised controls, avatars |
| lines | `--line` `--line-strong` | row dividers; control and panel borders |
| text | `--text` `--text-2` `--text-3` | primary, secondary, quiet. All pass 4.5:1 on `--bg` |
| accent | `--accent` `--accent-fill` `--accent-fill-hover` `--on-accent` `--accent-wash` `--accent-line` | ship numbers, primary button, your row |
| state | `--good` `--warn` `--bad`, each with `-wash` and `-line` | notes after a form, open tag, danger zone |
| heat | `--heat-0` .. `--heat-4` | ships a day: 0, 1-2, 3-5, 6-11, 12+ |
| segmented | `--seg-track` `--seg-on` | tab tracks and the selected tab |
| podium | `--pod-top` `--pod-front` `--pod-side` | the three faces of a podium step |
| gem | `--gem-1` .. `--gem-4` | the four gem facets, light to dark |
| crews | `CREW_SHADES` in `layout.ts`, text in `--on-crew` | a crew's color, picked by a hash of its slug |

**Type.** Geist Mono only, weights 400, 500 and 600. Body is 14px on a 22px
line; meta text 12-13px; ship numbers 16px; page titles 28px (20px on
phones). No uppercase labels and no letter-spacing on small text. Large numbers
tighten to between -0.02em and -0.05em.

**Space.** A 4px grid: 4, 8, 12, 16, 20, 24, 32, 48.

**Radius.** `--r-2` 6px controls, `--r-3` 10px panels and cards, `--r-full`
pills. Heat cells are 2-3px, avatars are circles.

**Depth.** Surface steps and 1px lines only. No shadows, gradients or glows.

**Layout.** One column, 880px max, 24px gutters (16px on phones). One
breakpoint at 640px.

**Motion.** `--t-fast` 120ms for hover and press, `--t-slow` 320ms for
entrances, `--ease-out` for both. Animate `transform` and `opacity` only.
What moves today: heat cells settle in left to right, the podium steps rise
in six frames, the live dot pulses, the gem's facets shift
on hover, and moving between pages cross-fades with `@view-transition`. Window
tabs swap in place without it, so a click answers at once.
`prefers-reduced-motion` turns all of it off.

## Icons and the gem

Line icons are drawn on a 20px grid with a 1.5px stroke, round caps and
`currentColor`, shown at 16px. Use `icon('name')` from `views/style.ts`. To
add one, draw it on the same grid and add its paths to `ICONS`. Do not use
emoji or text glyphs as icons.

The favicon and the README badge (`renderBadge()` in `views/profile.ts`) are
shown as images on other sites, so they cannot read the tokens and use fixed
colors instead.

The gem is the brand mark: an octahedron seen from above with four flat facets,
one token each, lit from the top left. Use `gem(size)`; it renders the same
shape in the top bar, the footer, notices and the favicon.

## Components

| Class | Use |
|---|---|
| `.nav` `.brand` `.places` `.account` `.menu` | top bar. Places become a segmented row on phones. The theme switch is a form posting to `/theme`; the account menu is a `<details>` |
| `.head` `.sub` | page header: title and a one-line summary |
| `.tabs` `.tab` `.tab-active` | time window switcher, made of links |
| `.btn` with `-primary` `-ghost` `-danger` `-quiet` `-sm` `-icon` `-block` | buttons and button-styled links |
| `.input` `.field` `.hint` | form controls |
| `table` `td.rank` `td.ships` `td.heat` `td.last` `.who` `.nm` `.meta` `.meta-sm` | ranked tables. `.meta-sm` repeats the hidden columns on phones |
| `tr.you` `.tag-you` | your own row and label. On the leaderboard (`.board`) it stays pinned to the bottom of the screen until you reach it |
| `.weeks` `.weeks-foot` | the profile's last twelve weeks: one square per day in the heat scale, a column per week, built as SVG on the server, with the totals in text underneath |
| `.podium` `.pod` `.pod-block` | the top three of a window on flat isometric steps; the table carries on from #4 |
| `.heatmap` `.cell` `.cell-0` .. `.cell-4` `.legend` | heat cells. Always give the row a text equivalent (`aria-label` or `title`) |
| `.stats` `.stat` `.v` `.l` `.s` | number tiles: value, label, context |
| `.panel` `.panel-h` `.panel-b` | grouped content with a header |
| `.tools .row` | one setting: title, description, control |
| `.card` | a single-task page such as an invite or a form |
| `.cmd` via `command(lines)` | a copyable command. The `$` prompt is drawn, never copied |
| `.tag` `.tag-open` `.tag-left` `.chip` `.pill` | small labels |
| `.av` via `avatar()`, `.mono` `.faces` `.stack` | people and crews |
| `.live` | a ship in the last 15 minutes |
| `.callout` | a link to another part of the site |
| `.note-good` `.note-bad` | the result of a form post |
| `.empty` `.notice` | empty states and 404s |
| `.back` via `renderBack()` | the way back to where you came from |
| `.hero` `.display` `.lead` | the home page's opening: one short line, what it does, the install command. `/` shows it on a first visit only; after that `/` goes to the leaderboard |
| `.endcard` `.mbar` | the CLI endcard drawn in HTML, with its ten-segment tier bar |
| `.kpis` `.kpi` | a row of headline numbers that links to the page behind them |
| `.sec-h` | a section title with an optional "see all" link |
| `.split` `.mini` | short ranked lists side by side |
| `.trio` | three short facts in a row |
| `.foot` | footer |

If a new page needs something that is not here, add it to `SITE_CSS` with
tokens, and add a row to this table.

## Writing

UI copy is lowercase, short and plain. Put the reader's action first. Buttons
say what happens ("start a crew", "copy link"). Empty states say what is
missing and how to fix it, often as a command. Times are relative ("3m ago")
with the exact UTC time in a `title`. No em dashes.

## Before you open a PR

- Colors come from tokens: grep your diff for `#` hex values outside `style.ts`,
  `CREW_SHADES`, the favicon and the badge.
- Look at every page you touched at 320, 390, 768 and 1280px wide, in dark and
  light. Nothing scrolls sideways.
- Tab through it: every control is reachable and shows a focus ring.
- New text colors pass 4.5:1 on the surface they sit on.
- With reduced motion on, nothing moves.
- The browser console shows no CSP errors.
- `npm run typecheck` and the e2e suites in `server/e2e` pass.

Browser automation note: Playwright launches Chromium with paint holding
turned off, and a page reached by clicking a link then never paints again
because of the cross-page view transition. Load each page with `page.goto`,
emulate reduced motion, or launch without Playwright's default flags. Real
browsers are not affected.

## Don't

- uppercase tracked labels, "NEW" pills or badges
- gradients, glows or colored shadows
- a colored stripe on one side of a rounded box
- emoji or text glyphs as icons
- inline style colors
- full-screen hero sections
- violet on anything that is not a ship or you
