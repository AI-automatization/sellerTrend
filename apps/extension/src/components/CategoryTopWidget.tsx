import { useState } from "react"

export interface TopProductItem {
  productId: string
  title: string
  score: number
  weeklyBought: number | null
  photoUrl: string | null
}

interface CategoryTopWidgetProps {
  categoryName: string
  products: TopProductItem[]
  onClose: () => void
}

function getScoreColorClass(score: number): string {
  if (score < 2) return "ventra-score-red"
  if (score < 3) return "ventra-score-orange"
  if (score < 3.5) return "ventra-score-yellow"
  if (score < 4) return "ventra-score-green"
  return "ventra-score-dark-green"
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "\u2026" : text
}

export default function CategoryTopWidget({
  categoryName,
  products,
  onClose,
}: CategoryTopWidgetProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (products.length === 0) return null

  return (
    <div className="ventra-top-widget">
      <div className="ventra-top-header">
        <div className="ventra-top-title-row">
          <div className="ventra-card-logo">V</div>
          <span className="ventra-top-title">Top {products.length}</span>
        </div>
        <div className="ventra-top-actions">
          <button
            className="ventra-top-toggle"
            onClick={() => setCollapsed((p) => !p)}
            title={collapsed ? "Ochish" : "Yig'ish"}
          >
            {collapsed ? "\u25B2" : "\u25BC"}
          </button>
          <button className="ventra-close-btn" onClick={onClose} title="Yopish">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="ventra-top-category">{truncate(categoryName, 40)}</div>
          <div className="ventra-top-list">
            {products.map((item, idx) => (
              <a
                key={item.productId}
                className="ventra-top-item"
                href={`https://uzum.uz/uz/product/-${item.productId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="ventra-top-rank">{idx + 1}</span>
                {item.photoUrl && (
                  <img
                    className="ventra-top-photo"
                    src={item.photoUrl}
                    alt=""
                    loading="lazy"
                  />
                )}
                <div className="ventra-top-info">
                  <span className="ventra-top-name">
                    {truncate(item.title, 36)}
                  </span>
                  <span className="ventra-top-meta">
                    <span className={getScoreColorClass(item.score)}>
                      {"\u2605"} {item.score.toFixed(1)}
                    </span>
                    {item.weeklyBought !== null && item.weeklyBought > 0 && (
                      <span className="ventra-top-wb">
                        {item.weeklyBought}/hft
                      </span>
                    )}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
