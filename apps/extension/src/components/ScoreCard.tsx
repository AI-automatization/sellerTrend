import { useState, useCallback } from "react"
import { sendToBackground } from "@plasmohq/messaging"

interface ScoreCardProps {
  productId: string
  score: number
  weeklyBought: number | null
  sellPrice: number | null
  trend: string | null
  onClose: () => void
}

function getScoreColorClass(score: number): string {
  if (score < 2) return "ventra-score-red"
  if (score < 3) return "ventra-score-orange"
  if (score < 3.5) return "ventra-score-yellow"
  if (score < 4) return "ventra-score-green"
  return "ventra-score-dark-green"
}

function getTrendInfo(trend: string | null) {
  if (trend === "rising" || trend === "up") {
    return { label: "o'smoqda", cls: "ventra-trend-rising", arrow: "\u25B2" }
  }
  if (trend === "falling" || trend === "down") {
    return { label: "tushmoqda", cls: "ventra-trend-falling", arrow: "\u25BC" }
  }
  return { label: "barqaror", cls: "ventra-trend-stable", arrow: "\u2014" }
}

function formatPrice(price: number | null): string {
  if (!price) return "\u2014"
  return price.toLocaleString("uz-UZ") + " so'm"
}

export default function ScoreCard({
  productId,
  score,
  weeklyBought,
  sellPrice,
  trend,
  onClose,
}: ScoreCardProps) {
  const [trackState, setTrackState] = useState<"idle" | "loading" | "tracked" | "error">("idle")

  const handleTrack = useCallback(async () => {
    if (trackState === "tracked" || trackState === "loading") return
    setTrackState("loading")
    try {
      const res = await sendToBackground({
        name: "track-product",
        body: { productId },
      })
      setTrackState(res.success ? "tracked" : "error")
    } catch {
      setTrackState("error")
    }
  }, [productId, trackState])

  const trendInfo = getTrendInfo(trend)
  const scoreColor = getScoreColorClass(score)

  const trackBtnClass =
    trackState === "loading"
      ? "ventra-track-btn ventra-track-loading"
      : trackState === "tracked"
        ? "ventra-track-btn ventra-track-tracked"
        : trackState === "error"
          ? "ventra-track-btn ventra-track-error"
          : "ventra-track-btn ventra-track-default"

  const trackLabel =
    trackState === "loading"
      ? "Yuklanmoqda..."
      : trackState === "tracked"
        ? "\u2713 Kuzatilmoqda"
        : trackState === "error"
          ? "Xatolik — qayta urinish"
          : "Kuzatishga qo'shish"

  return (
    <div className="ventra-score-card">
      <div className="ventra-card-header">
        <div className="ventra-card-title">
          <div className="ventra-card-logo">V</div>
          VENTRA Score
        </div>
        <button className="ventra-close-btn" onClick={onClose} title="Yopish">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M1 13L13 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="ventra-card-body">
        <div className="ventra-score-main">
          <div className={`ventra-score-value ${scoreColor}`}>
            {score.toFixed(1)}
            <span className="ventra-score-max">/5</span>
          </div>
          <span className={`ventra-score-trend ${trendInfo.cls}`}>
            {trendInfo.arrow} {trendInfo.label}
          </span>
        </div>

        <div className="ventra-score-details">
          <div className="ventra-detail-row">
            <span className="ventra-detail-label">Haftalik sotilgan</span>
            <span className="ventra-detail-value">
              {weeklyBought !== null ? `${weeklyBought} ta` : "\u2014"}
            </span>
          </div>
          <div className="ventra-detail-row">
            <span className="ventra-detail-label">Narx</span>
            <span className="ventra-detail-value">{formatPrice(sellPrice)}</span>
          </div>
        </div>

        <button
          className={trackBtnClass}
          onClick={trackState === "error" ? () => setTrackState("idle") : handleTrack}
          disabled={trackState === "tracked" || trackState === "loading"}
        >
          {trackLabel}
        </button>
      </div>
    </div>
  )
}
