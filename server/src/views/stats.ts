import type { StatsData } from "../routes/stats.js";
import { formatCount, renderPage, type NavContext } from "./layout.js";

function badge(n: number): string {
  return `<span class="num">${formatCount(n)}</span>`;
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

  return renderPage({
    title: "vibetime stats",
    place: "stats",
    nav,
    preview: {
      title: "vibetime stats",
      description: `${formatCount(devs)} ${devWord} ${verb} shipped ${formatCount(ships)} ${timeWord} across ${formatCount(projects)} ${projectWord} on vibetime. ${formatCount(crews)} ${crewWord} and counting.`,
    },
    body: `<section aria-label="all-time stats">
    <p class="statement">
      ${badge(devs)} ${devWord} ${verb} shipped ${badge(ships)} ${timeWord} across ${badge(projects)} ${projectWord} on vibetime. ${badge(crews)} ${crewWord} and counting.
    </p>
  </section>
  <dl class="defs">
    <div><dt>developers</dt><dd>signed-in people with at least one ship</dd></div>
    <div><dt>ships</dt><dd>sessions that landed a commit plus more than 50 lines or more than 3 files</dd></div>
    <div><dt>projects</dt><dd>repos with at least one ship, told apart by a hash of their name</dd></div>
    <div><dt>crews</dt><dd>crews with at least one current member</dd></div>
  </dl>
  <div class="board-foot"><span>all time · updated ${updatedAt.toISOString().slice(11, 16)} utc</span></div>`,
  });
}
