import { useState, useEffect, useRef } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"

import { parseProductIdFromHref, isCategoryPage } from "~/lib/url-parser"
import { onUrlChange, onProductCardsAdded } from "~/lib/spa-observer"
import { createBadgeElement, removeBadges, BADGE_ATTR } from "~/components/ScoreBadge"
import type { AuthStateResponseBody } from "~/background/messages/get-auth-state"
import type {
  BatchQuickScoreRequestBody,
  BatchQuickScoreResponseBody,
} from "~/background/messages/batch-quick-score"

// ── Plasmo CSUI Config ──────────────────────────────────────

export const config: PlasmoCSConfig = {
  matches: ["https://uzum.uz/*"],
  run_at: "document_idle",
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `:host { display: none !important; }`
  return style
}

// ── Score Cache ─────────────────────────────────────────────

const scoreCache = new Map<string, { score: number; weeklyBought: number | null }>()

// ── Component ───────────────────────────────────────────────

export default function CategoryPageOverlay() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const processingRef = useRef(false)

  // Check auth state and listen for changes
  useEffect(() => {
    // Check auth immediately
    function checkAuth() {
      sendToBackground<Record<string, never>, AuthStateResponseBody>({
        name: "get-auth-state",
        body: {},
      })
        .then((state) => setIsLoggedIn(state.isLoggedIn))
        .catch(() => setIsLoggedIn(false))
    }

    checkAuth()

    // Re-check auth when storage changes (login/logout)
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Main badge injection logic
  useEffect(() => {
    if (!isLoggedIn) return

    async function processCards(cards?: Element[]) {
      if (processingRef.current) return
      processingRef.current = true

      try {
        const targetCards =
          cards ??
          Array.from(
            document.querySelectorAll('[data-test-id="product-card--default"]')
          )

        // Extract product IDs from card links
        const cardIdMap = new Map<string, Element>()
        for (const card of targetCards) {
          // Skip cards that already have a badge
          if (card.querySelector(`[${BADGE_ATTR}]`)) continue

          const link = card.querySelector('a[href*="/product/"]') as HTMLAnchorElement | null
          if (!link) continue
          const href = link.getAttribute("href")
          if (!href) continue
          const id = parseProductIdFromHref(href)
          if (id) cardIdMap.set(id, card)
        }

        if (cardIdMap.size === 0) return

        // Find IDs not in cache
        const uncachedIds = Array.from(cardIdMap.keys()).filter(
          (id) => !scoreCache.has(id)
        )

        // Batch fetch uncached scores
        if (uncachedIds.length > 0) {
          try {
            const res = await sendToBackground<
              BatchQuickScoreRequestBody,
              BatchQuickScoreResponseBody
            >({
              name: "batch-quick-score",
              body: { productIds: uncachedIds },
            })

            if (res.success && res.results) {
              for (const item of res.results) {
                if (item.found && item.score != null) {
                  scoreCache.set(item.product_id, {
                    score: item.score,
                    weeklyBought: item.weekly_bought ?? null,
                  })
                }
              }
            }
          } catch {
            // Batch fetch failed — skip badge injection for uncached
          }
        }

        // Inject badges into cards
        for (const [id, card] of cardIdMap) {
          const cached = scoreCache.get(id)
          if (!cached) continue

          // Double-check no badge exists (race condition guard)
          if (card.querySelector(`[${BADGE_ATTR}]`)) continue

          const badge = createBadgeElement(cached.score, cached.weeklyBought)
          card.appendChild(badge)
        }
      } finally {
        processingRef.current = false
      }
    }

    function handleUrl(url: string) {
      removeBadges()
      if (isCategoryPage(url)) {
        // Small delay to let Vue render the DOM
        setTimeout(() => processCards(), 500)
      }
    }

    handleUrl(window.location.href)

    const cleanupUrl = onUrlChange(handleUrl)
    const cleanupCards = onProductCardsAdded((newCards) => {
      if (isCategoryPage(window.location.href)) {
        processCards(newCards)
      }
    })

    return () => {
      cleanupUrl()
      cleanupCards()
      removeBadges()
    }
  }, [isLoggedIn])

  // This component renders nothing — it manages badges via DOM manipulation
  return null
}
