import type { UzumProductData } from "~/lib/uzum-api"

interface UzumCardProps {
  uzumData: UzumProductData
  onClose: () => void
}

export default function UzumCard({ uzumData, onClose }: UzumCardProps) {
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

        {/* VENTRA score not yet available notice */}
        <div style={{
          fontSize: "11px",
          color: "#9ca3af",
          textAlign: "center",
          padding: "4px 0",
          borderTop: "1px solid #f3f4f6",
          marginTop: "4px"
        }}>
          VENTRA score hali mavjud emas
        </div>

      </div>
    </div>
  )
}
