import { useState, useEffect } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"

import { parseProductIdFromUrl, isProductPage } from "~/lib/url-parser"
import { onUrlChange } from "~/lib/spa-observer"
import ScoreCard from "~/components/ScoreCard"
import UzumCard from "~/components/UzumCard"
import type { AuthStateResponseBody } from "~/background/messages/get-auth-state"
import type { QuickScoreResponseBody } from "~/background/messages/quick-score"
import type { UzumProductData } from "~/lib/uzum-api"

import styleText from "data-text:./plasmo-overlay.css"

// ── Plasmo CSUI Config ──────────────────────────────────────

export const config: PlasmoCSConfig = {
  matches: ["https://uzum.uz/*"],
  run_at: "document_idle",
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

// ── Component ───────────────────────────────────────────────

interface QuickScoreData {
  score: number
  weekly_bought: number | null
  trend: string | null
  sell_price: number
  last_updated: string
}

export default function ProductPageOverlay() {
  const [productId, setProductId] = useState<string | null>(null)
  const [scoreData, setScoreData] = useState<QuickScoreData | null>(null)
  const [uzumData, setUzumData] = useState<UzumProductData | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [visible, setVisible] = useState(true)

  // Check auth state and listen for changes
  useEffect(() => {
    function checkAuth() {
      sendToBackground<Record<string, never>, AuthStateResponseBody>({
        name: "get-auth-state",
        body: {},
      })
        .then((state) => setIsLoggedIn(state.isLoggedIn))
        .catch(() => setIsLoggedIn(false))
    }

    checkAuth()

    const handleStorageChange = () => { checkAuth() }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Watch URL changes for SPA navigation
  useEffect(() => {
    function handleUrl(url: string) {
      if (isProductPage(url)) {
        const id = parseProductIdFromUrl(url)
        setProductId(id)
        setScoreData(null)
        setUzumData(null)
        setVisible(true)
      } else {
        setProductId(null)
      }
    }

    handleUrl(window.location.href)
    return onUrlChange(handleUrl)
  }, [])

  // Fetch score when productId changes
  useEffect(() => {
    if (!productId || !isLoggedIn) return

    let cancelled = false

    sendToBackground<{ productId: string }, QuickScoreResponseBody>({
      name: "quick-score",
      body: { productId },
    })
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          setScoreData(res.data)
          if (res.uzumData) setUzumData(res.uzumData)
        } else if (res.success && res.uzumData) {
          // VENTRA has no score — show uzum.uz data instead
          setUzumData(res.uzumData)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [productId, isLoggedIn])

  // ── Render ──────────────────────────────────────────────

  if (!productId || !visible) return null

  if (!isLoggedIn) {
    return (
      <div className="ventra-login-hint">
        <div className="ventra-login-logo">V</div>
        VENTRA ga kiring
      </div>
    )
  }

  // VENTRA score available
  if (scoreData) {
    return (
      <ScoreCard
        productId={productId}
        score={scoreData.score}
        weeklyBought={scoreData.weekly_bought}
        sellPrice={scoreData.sell_price}
        trend={scoreData.trend}
        onClose={() => setVisible(false)}
      />
    )
  }

  // Uzum.uz fallback — VENTRA score not yet available
  if (uzumData) {
    return (
      <UzumCard
        productId={productId}
        uzumData={uzumData}
        onClose={() => setVisible(false)}
      />
    )
  }

  return null
}
