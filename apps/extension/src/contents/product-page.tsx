import { useState, useEffect } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"

import { parseProductIdFromUrl, isProductPage } from "~/lib/url-parser"
import { onUrlChange } from "~/lib/spa-observer"
import { registerHotkeys } from "~/lib/hotkeys"
import { addFavorite, removeFavorite, isFavorite } from "~/lib/storage"
import ScoreCard from "~/components/ScoreCard"
import UzumCard from "~/components/UzumCard"
import type { AuthStateResponseBody } from "~/background/messages/get-auth-state"
import type { QuickScoreResponseBody } from "~/background/messages/quick-score"
import type { GetTrackedProductsResponseBody } from "~/background/messages/get-tracked-products"
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
  const [isTracked, setIsTracked] = useState(false)
  const [favToast, setFavToast] = useState<string | null>(null)

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

  // Hotkeys: Ctrl+Shift+T = toggle overlay, Ctrl+Shift+S = toggle favorite
  useEffect(() => {
    if (!productId) return;

    return registerHotkeys((action) => {
      if (action === "toggle-overlay") {
        setVisible((v) => !v);
      } else if (action === "toggle-favorite") {
        isFavorite(productId).then((fav) => {
          const next = !fav;
          const fn = next ? addFavorite : removeFavorite;
          fn(productId).catch(() => {});
          setFavToast(next ? "⭐ Sevimlilarga qo'shildi" : "☆ Sevimlilardan olib tashlandi");
          setTimeout(() => setFavToast(null), 2000);
        }).catch(() => {});
      }
    });
  }, [productId]);

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

  // Fetch score + tracked state in parallel when productId changes
  useEffect(() => {
    if (!productId || !isLoggedIn) return

    let cancelled = false

    // Parallel: quick-score + tracked products list
    Promise.all([
      sendToBackground<{ productId: string }, QuickScoreResponseBody>({
        name: "quick-score",
        body: { productId },
      }),
      sendToBackground<Record<string, never>, GetTrackedProductsResponseBody>({
        name: "get-tracked-products",
        body: {},
      }),
    ])
      .then(([scoreRes, trackedRes]) => {
        if (cancelled) return

        // Check if current product is tracked by this user
        const trackedIds = new Set(
          (trackedRes.success ? trackedRes.data ?? [] : []).map((p) => p.product_id)
        )
        setIsTracked(trackedIds.has(productId))

        if (scoreRes.success && scoreRes.data) {
          setScoreData(scoreRes.data)
          if (scoreRes.uzumData) setUzumData(scoreRes.uzumData)
        } else if (scoreRes.success && scoreRes.uzumData) {
          setUzumData(scoreRes.uzumData)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [productId, isLoggedIn])

  // ── Render ──────────────────────────────────────────────

  if (!productId) return null;

  const toast = favToast ? <div className="ventra-toast">{favToast}</div> : null;

  if (!visible) return toast;

  if (!isLoggedIn) {
    return (
      <>
        {toast}
        <div className="ventra-login-hint">
          <div className="ventra-login-logo">V</div>
          VENTRA ga kiring
        </div>
      </>
    )
  }

  if (scoreData) {
    return (
      <>
        {toast}
        <ScoreCard
          productId={productId}
          score={scoreData.score}
          weeklyBought={scoreData.weekly_bought}
          sellPrice={scoreData.sell_price}
          trend={scoreData.trend}
          onClose={() => setVisible(false)}
          initialTracked={isTracked}
        />
      </>
    )
  }

  // Uzum.uz fallback — VENTRA score not yet available
  if (uzumData) {
    return (
      <>
        {toast}
        <UzumCard
          uzumData={uzumData}
          onClose={() => setVisible(false)}
        />
      </>
    )
  }

  return toast;
}
