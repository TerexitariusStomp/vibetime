import type { StatsData } from "../routes/stats.js";
import { NAV_STYLE, renderNav, type NavContext } from "./layout.js";

function badge(n: number): string {
  return `<span class="num">${n.toLocaleString("en-US")}</span>`;
}

export function renderStats(
  data: StatsData,
  updatedAt: Date,
  nav: NavContext,
): string {
  const { devs, ships, projects, crews } = data;
  const devWord = devs === 1 ? "developer" : "developers";
  const verb = devs === 1 ? "has" : "have";
  const projectWord = projects === 1 ? "project" : "projects";
  const timeWord = ships === 1 ? "time" : "times";
  const crewWord = crews === 1 ? "crew" : "crews";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>vibetime stats</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #0a0a0a; color: #e5e5e5; padding: 32px 16px; min-height: 100vh; display: flex; flex-direction: column; }
  main { max-width: 760px; width: 100%; margin: 0 auto; flex: 1; display: flex; flex-direction: column; }
  .stage { flex: 1; display: flex; align-items: center; padding: 72px 0 88px; }
  .statement {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: clamp(22px, 3.4vw, 30px);
    font-weight: 400;
    line-height: 1.7;
    letter-spacing: -0.01em;
    color: #e5e5e5;
  }
  .num {
    display: inline-block;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: #a78bfa;
    background: #15101f;
    padding: 2px 10px;
    border-radius: 6px;
    line-height: 1.35;
    letter-spacing: 0;
  }
  footer { color: #444; font-size: 11px; margin-top: auto; padding-top: 16px; border-top: 1px solid #141414; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  footer a { color: #666; text-decoration: none; }
  footer a:hover { color: #a78bfa; }
  ${NAV_STYLE}
  @media (max-width: 600px) {
    body { padding: 20px 12px; }
    .stage { padding: 48px 0 64px; }
    .statement { line-height: 1.72; }
    .num { padding: 2px 8px; }
  }
</style>
</head>
<body>
<main>
  ${renderNav("stats", nav)}
  <section class="stage" aria-label="all-time stats">
    <p class="statement">
      ${badge(devs)} ${devWord} ${verb} shipped ${badge(ships)} ${timeWord} across ${badge(projects)} ${projectWord} on vibetime. ${badge(crews)} ${crewWord} and counting.
    </p>
  </section>
  <footer>
    <span>all-time · updated ${updatedAt.toISOString().slice(0, 16).replace("T", " ")}Z</span>
    <span><a href="https://github.com/iamnotstatic/vibetime">github.com/iamnotstatic/vibetime</a> · <code>npm i -g vibetime-cli</code></span>
  </footer>
</main>
</body>
</html>`;
}
