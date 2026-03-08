import { useState, useEffect, useRef, useCallback } from "react"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { sendToBackground } from "@plasmohq/messaging"

import {
  parseProductIdFromHref,
  isCategoryPage,
  parseCategoryIdFromUrl,
} from "~/lib/url-parser"
import { onUrlChange, onProductCardsAdded } from "~/lib/spa-observer"
import { createBadgeElement, removeBadges, BADGE_ATTR } from "~/components/ScoreBadge"
import CategoryTopWidget from "~/components/CategoryTopWidget"
import type { TopProductItem } from "~/components/CategoryTopWidget"
import type { AuthStateResponseBody } from "~/background/messages/get-auth-state"
import type {
  BatchQuickScoreRequestBody,
  BatchQuickScoreResponseBody,
} from "~/background/messages/batch-quick-score"

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

// ── Score Cache ─────────────────────────────────────────────

interface CachedProduct {
  score: number
  weeklyBought: number | null
  title: string
  photoUrl: string | null
}

const scoreCache = new Map<string, CachedProduct>()

// ── Helpers ─────────────────────────────────────────────────

const MAX_TOP = 10

function parseCategoryNameFromDOM(): string {
  const h1 = document.querySelector("h1")
  if (h1?.textContent?.trim()) return h1.textContent.trim()
  const breadcrumb = document.querySelector(
    '[data-test-id="breadcrumb"] span:last-child, .breadcrumbs span:last-child'
  )
  if (breadcrumb?.textContent?.trim()) return breadcrumb.textContent.trim()
  return "Kategoriya"
}

function buildTopProducts(categoryProductIds: Set<string>): TopProductItem[] {
  const items: TopProductItem[] = []
  for (const id of categoryProductIds) {
    const cached = scoreCache.get(id)
    if (!cached || !cached.title) continue
    items.push({
      productId: id,
      title: cached.title,
      score: cached.score,
      weeklyBought: cached.weeklyBought,
      photoUrl: cached.photoUrl,
    })
  }
  items.sort((a, b) => b.score - a.score)
  return items.slice(0, MAX_TOP)
}

// ── Component ───────────────────────────────────────────────

export default function CategoryPageOverlay() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([])
  const [categoryName, setCategoryName] = useState("")
  const [widgetVisible, setWidgetVisible] = useState(true)
  const [onCategoryPage, setOnCategoryPage] = useState(false)
  const processingRef = useRef(false)
  const categoryProductIdsRef = useRef(new Set<string>())

  // Check auth state once
  useEffect(() => {
    sendToBackground<Record<string, never>, AuthStateResponseBody>({
      name: "get-auth-state",
      body: {},
    })
      .then((state) => setIsLoggedIn(state.isLoggedIn))
      .catch(() => setIsLoggedIn(false))
  }, [])

  const refreshTopProducts = useCallback(() => {
    const items = buildTopProducts(categoryProductIdsRef.current)
    setTopProducts(items)
  }, [])

  // Main badge injection + data collection logic
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
          if (card.querySelector(`[${BADGE_ATTR}]`)) continue

          const link = card.querySelector(
            'a[href*="/product/"]'
          ) as HTMLAnchorElement | null
          if (!link) continue
          const href = link.getAttribute("href")
          if (!href) continue
          const id = parseProductIdFromHref(href)
          if (id) cardIdMap.set(id, card)
        }

        if (cardIdMap.size === 0) return

        // Track IDs for this category page
        for (const id of cardIdMap.keys()) {
          categoryProductIdsRef.current.add(id)
        }

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
                    title: item.title ?? "",
                    photoUrl: item.photo_url ?? null,
                  })
                }
              }
            }
          } catch {
            // Batch fetch failed — skip
          }
        }

        // Inject badges into cards
        for (const [id, card] of cardIdMap) {
          const cached = scoreCache.get(id)
          if (!cached) continue
          if (card.querySelector(`[${BADGE_ATTR}]`)) continue

          const badge = createBadgeElement(cached.score, cached.weeklyBought)
          card.appendChild(badge)
        }

        // Update top products widget
        refreshTopProducts()
      } finally {
        processingRef.current = false
      }
    }

    function handleUrl(url: string) {
      removeBadges()
      categoryProductIdsRef.current.clear()
      setTopProducts([])

      if (isCategoryPage(url)) {
        setOnCategoryPage(true)
        setWidgetVisible(true)
        setTimeout(() => {
          setCategoryName(parseCategoryNameFromDOM())
          processCards()
        }, 500)
      } else {
        setOnCategoryPage(false)
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
  }, [isLoggedIn, refreshTopProducts])

  // ── Render ──────────────────────────────────────────────

  if (!onCategoryPage || !isLoggedIn || !widgetVisible) return null
  if (topProducts.length === 0) return null

  return (
    <CategoryTopWidget
      categoryName={categoryName}
      products={topProducts}
      onClose={() => setWidgetVisible(false)}
    />
  )
}
