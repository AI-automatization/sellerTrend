import { useState, useCallback } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import type { UzumProductData } from "~/lib/uzum-api"

interface UzumCardProps {
  uzumData: UzumProductData
  onClose: () => void
}

export default function UzumCard({ uzumData, onClose }: UzumCardProps) {
  const [trackState, setTrackState] = useState<"idle" | "loading" | "tracked" | "error">("idle")

  const handleTrack = useCallback(async () => {
    if (trackState === "tracked" || trackState === "loading") return
    setTrackState("loading")
    try {
      const res = await sendToBackground({
        name: "track-product",
        body: { productId: uzumData.id.toString() },
      })
      setTrackState(res.success ? "tracked" : "error")
    } catch {
      setTrackState("error")
    }
  }, [uzumData.id, trackState])
  return (
    <div className="ventra-score-card">
      <div className="ventra-card-header">
        <div className="ventra-card-title">
          <div className="ventra-card-logo">V</div>
          VENTRA
        </div>
        <button className="ventra-close-btn" onClick={onClose} title="Yopish">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="ventra-card-body">
        {/* Title */}
        <div style={{ fontSize: "12px", color: "#374151", lineHeight: "1.4", marginBottom: "4px" }}>
          {uzumData.title.length > 60
            ? uzumData.title.slice(0, 60) + "…"
            : uzumData.title}
        </div>

        {/* Uzum stats */}
        <div className="ventra-score-details">
          <div className="ventra-detail-row">
            <span className="ventra-detail-label">Narx</span>
            <span className="ventra-detail-value">
              {uzumData.purchasePrice.toLocaleString("uz-UZ")} so'm
            </span>
          </div>
          <div className="ventra-detail-row">
            <span className="ventra-detail-label">Reyting</span>
            <span className="ventra-detail-value">
              ⭐ {uzumData.rating.toFixed(1)} ({uzumData.reviewsAmount} sharh)
            </span>
          </div>
          <div className="ventra-detail-row">
            <span className="ventra-detail-label">Buyurtmalar</span>
            <span className="ventra-detail-value">
              {uzumData.ordersAmount.toLocaleString()} ta
            </span>
          </div>
          <div className="ventra-detail-row">
            <span className="ventra-detail-label">Ombor</span>
            <span className="ventra-detail-value">
              {uzumData.totalAvailableAmount.toLocaleString()} dona
            </span>
          </div>
        </div>

        {/* Status notice */}
        <div style={{
          fontSize: "11px",
          color: trackState === "tracked" ? "#16a34a" : "#9ca3af",
          textAlign: "center",
          padding: "4px 0",
          borderTop: "1px solid #f3f4f6",
        }}>
          {trackState === "tracked"
            ? "VENTRA tez orada tahlil qiladi"
            : "VENTRA score hali mavjud emas"}
        </div>

        {/* Track button */}
        <button
          className={
            trackState === "loading"
              ? "ventra-track-btn ventra-track-loading"
              : trackState === "tracked"
                ? "ventra-track-btn ventra-track-tracked"
                : trackState === "error"
                  ? "ventra-track-btn ventra-track-error"
                  : "ventra-track-btn ventra-track-default"
          }
          onClick={trackState === "error" ? () => setTrackState("idle") : handleTrack}
          disabled={trackState === "tracked" || trackState === "loading"}
        >
          {trackState === "loading"
            ? "Yuklanmoqda..."
            : trackState === "tracked"
              ? "✓ Kuzatilmoqda"
              : trackState === "error"
                ? "Xatolik — qayta urinish"
                : "Kuzatishga qo'shish"}
        </button>

      </div>
    </div>
  )
}
