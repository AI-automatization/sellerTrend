import { useState, useEffect, useCallback } from "react"
import { sendToBackground } from "@plasmohq/messaging"
import type {
  QuickScoreRequestBody,
  QuickScoreResponseBody,
} from "~/background/messages/quick-score"

interface QuickScoreData {
  score: number
  weekly_bought: number | null
  trend: string | null
  sell_price: number
  last_updated: string
}

function getScoreColor(score: number): string {
  if (score < 2) return "#dc2626"
  if (score < 3) return "#ea580c"
  if (score < 3.5) return "#ca8a04"
  if (score < 4) return "#16a34a"
  return "#15803d"
}

function getTrendLabel(trend: string | null): { text: string; arrow: string; color: string } {
  if (trend === "rising" || trend === "up") {
    return { text: "o'smoqda", arrow: "\u25B2", color: "#16a34a" }
  }
  if (trend === "falling" || trend === "down") {
    return { text: "tushmoqda", arrow: "\u25BC", color: "#dc2626" }
  }
  return { text: "barqaror", arrow: "\u2014", color: "#6b7280" }
}

function formatPrice(price: number | null): string {
  if (!price) return "\u2014"
  return price.toLocaleString("uz-UZ") + " so'm"
}

function parseProductId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) return trimmed

  const match = trimmed.match(/\/product\/[^?/]*?(\d+)(?:[?/]|$)/)
  return match ? match[1] : null
}

export default function QuickAnalyze() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<QuickScoreData | null>(null)
  const [analyzedId, setAnalyzedId] = useState<string | null>(null)
  const [trackState, setTrackState] = useState<"idle" | "loading" | "tracked" | "error">("idle")

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url && /uzum\.uz.*\/product\//.test(url)) {
        setInput(url)
      }
    })
  }, [])

  const handleAnalyze = useCallback(async () => {
    const productId = parseProductId(input)
    if (!productId) {
      setError("Mahsulot ID yoki URL kiriting")
      return
    }

    setError("")
    setLoading(true)
    setResult(null)
    setTrackState("idle")

    try {
      const res = await sendToBackground<QuickScoreRequestBody, QuickScoreResponseBody>({
        name: "quick-score",
        body: { productId },
      })

      if (res.success && res.data) {
        setResult(res.data)
        setAnalyzedId(productId)
      } else {
        setError(res.error ?? "Tahlil qilishda xatolik")
      }
    } catch {
      setError("Serverga ulanib bo'lmadi")
    } finally {
      setLoading(false)
    }
  }, [input])

  const handleTrack = useCallback(async () => {
    if (!analyzedId || trackState === "loading" || trackState === "tracked") return

    setTrackState("loading")
    try {
      const res = await sendToBackground({
        name: "track-product",
        body: { productId: analyzedId },
      })
      setTrackState(
        (res as { success: boolean }).success ? "tracked" : "error",
      )
    } catch {
      setTrackState("error")
    }
  }, [analyzedId, trackState])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !loading) {
        handleAnalyze()
      }
    },
    [handleAnalyze, loading],
  )

  const trendInfo = result ? getTrendLabel(result.trend) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Mahsulot ID yoki URL"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="input input-bordered input-sm flex-1 min-w-0"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !input.trim()}
          className="btn btn-primary btn-sm"
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9 4.804A7.968 7.968 0 0 0 5.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0 1 5.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0 1 14.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0 0 14.5 4c-1.669 0-3.218.51-4.5 1.385V15" />
            </svg>
          )}
        </button>
      </div>

      {error && (
        <div className="text-error text-xs text-center">{error}</div>
      )}

      {result && analyzedId && (
        <div className="bg-base-200 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="text-xl font-bold"
                style={{ color: getScoreColor(result.score) }}
              >
                {result.score.toFixed(1)}
              </span>
              <span className="text-xs opacity-50">/5</span>
            </div>
            {trendInfo && (
              <span className="text-xs font-medium" style={{ color: trendInfo.color }}>
                {trendInfo.arrow} {trendInfo.text}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="opacity-60">Haftalik sotilgan</span>
              <span className="font-medium">
                {result.weekly_bought !== null ? `${result.weekly_bought} ta` : "\u2014"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="opacity-60">Narx</span>
              <span className="font-medium">{formatPrice(result.sell_price)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="opacity-60">ID</span>
              <span className="font-medium">#{analyzedId}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleTrack}
              disabled={trackState === "tracked" || trackState === "loading"}
              className={`btn btn-xs flex-1 ${
                trackState === "tracked"
                  ? "btn-success"
                  : trackState === "error"
                    ? "btn-error"
                    : "btn-outline btn-primary"
              }`}
            >
              {trackState === "loading" && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {trackState === "tracked" && "\u2713 Kuzatilmoqda"}
              {trackState === "error" && "Xatolik"}
              {trackState === "idle" && "Kuzatish"}
            </button>
            <button
              onClick={() => {
                chrome.tabs.create({
                  url: `https://uzum.uz/uz/product/-${analyzedId}`,
                })
              }}
              className="btn btn-xs btn-ghost"
              title="Uzum da ochish"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
