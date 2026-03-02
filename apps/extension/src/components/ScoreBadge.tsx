/**
 * ScoreBadge — creates a DOM element to inject into product cards.
 * Uses inline styles so it works in the main page DOM (not shadow DOM).
 */

const BADGE_ATTR = "data-ventra-badge"

function getScoreColor(score: number): string {
  if (score < 2) return "#dc2626"
  if (score < 3) return "#ea580c"
  if (score < 3.5) return "#ca8a04"
  if (score < 4) return "#16a34a"
  return "#15803d"
}

export function createBadgeElement(
  score: number,
  weeklyBought: number | null
): HTMLDivElement {
  const badge = document.createElement("div")
  badge.setAttribute(BADGE_ATTR, "true")

  const color = getScoreColor(score)

  badge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: ${color};
    margin-top: 4px;
    line-height: 1.4;
  `

  const starSpan = document.createElement("span")
  starSpan.textContent = "\u2605"
  starSpan.style.fontSize = "11px"

  const scoreSpan = document.createElement("span")
  scoreSpan.textContent = score.toFixed(1)

  badge.appendChild(starSpan)
  badge.appendChild(scoreSpan)

  if (weeklyBought !== null && weeklyBought > 0) {
    const sep = document.createElement("span")
    sep.textContent = "\u00B7"
    sep.style.color = "#9ca3af"
    sep.style.margin = "0 2px"

    const wbSpan = document.createElement("span")
    wbSpan.textContent = `${weeklyBought}/hft`
    wbSpan.style.color = "#6b7280"
    wbSpan.style.fontWeight = "500"

    badge.appendChild(sep)
    badge.appendChild(wbSpan)
  }

  return badge
}

export function removeBadges(): void {
  document.querySelectorAll(`[${BADGE_ATTR}]`).forEach((el) => el.remove())
}

export { BADGE_ATTR }
