import { useState, useEffect } from "react"
import { sendToBackground } from "@plasmohq/messaging"

interface TrackedProduct {
  product_id: string
  title: string | null
  score: number | null
  weekly_bought: number | null
}

interface GetTrackedResponseBody {
  success: boolean
  data?: TrackedProduct[]
  error?: string
}

function getScoreColor(score: number): string {
  if (score < 2) return "#dc2626"
  if (score < 3) return "#ea580c"
  if (score < 3.5) return "#ca8a04"
  if (score < 4) return "#16a34a"
  return "#15803d"
}

const DASHBOARD_URL =
  process.env.PLASMO_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:5173"

export default function TrackedList() {
  const [products, setProducts] = useState<TrackedProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sendToBackground<Record<string, never>, GetTrackedResponseBody>({
      name: "get-tracked-products",
      body: {},
    })
      .then((res) => {
        if (res.success && res.data) {
          setProducts(res.data.slice(0, 10))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
        <span className="loading loading-spinner loading-sm text-primary" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0", color: "#9ca3af", fontSize: "13px" }}>
        Kuzatilayotgan mahsulotlar yo'q
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          padding: "0 0 6px",
        }}
      >
        Kuzatilmoqda ({products.length})
      </div>

      {products.map((p) => (
        <button
          key={p.product_id}
          onClick={() => {
            chrome.tabs.create({
              url: `https://uzum.uz/uz/product/-${p.product_id}`,
            })
          }}
          className="btn btn-ghost btn-xs w-full justify-start"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px",
            height: "auto",
            minHeight: "unset",
            textAlign: "left",
          }}
        >
          {p.score !== null && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: getScoreColor(p.score),
                minWidth: "28px",
              }}
            >
              {p.score.toFixed(1)}
            </span>
          )}
          <span
            style={{
              fontSize: "12px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {p.title ?? `#${p.product_id}`}
          </span>
          {p.weekly_bought !== null && p.weekly_bought > 0 && (
            <span style={{ fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap" }}>
              {p.weekly_bought}/hft
            </span>
          )}
        </button>
      ))}

      <a
        href={DASHBOARD_URL}
        target="_blank"
        rel="noreferrer"
        className="btn btn-ghost btn-xs w-full"
        style={{ marginTop: "4px", fontSize: "11px", color: "#6366f1" }}
      >
        Hammasini ko'rish &rarr;
      </a>
    </div>
  )
}
