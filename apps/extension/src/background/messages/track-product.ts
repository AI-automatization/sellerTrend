import type { PlasmoMessaging } from "@plasmohq/messaging"
import { trackProduct, ApiError } from "~/lib/api"
import { setBadgeCount } from "~/lib/badge"
import { notifyTrackSuccess, notifyTrackError } from "~/lib/notifications"

export interface TrackProductRequestBody {
  productId: string
}

export interface TrackProductResponseBody {
  success: boolean
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  TrackProductRequestBody,
  TrackProductResponseBody
> = async (req, res) => {
  const { productId } = req.body!

  try {
    await trackProduct(productId)
    // Update badge count (fire-and-forget)
    try {
      const { getTrackedProducts } = await import("~/lib/api")
      const products = await getTrackedProducts()
      const activeCount = products.filter((p) => p.is_active).length
      await setBadgeCount(activeCount)
    } catch {
      // Badge update is non-critical
    }
    notifyTrackSuccess().catch(() => {})
    res.send({ success: true })
  } catch (err) {
    if (err instanceof ApiError) {
      notifyTrackError(err.message).catch(() => {})
      res.send({ success: false, error: `${err.status}: ${err.message}` })
    } else {
      const message = err instanceof Error ? err.message : "Unknown error"
      notifyTrackError(message).catch(() => {})
      res.send({ success: false, error: message })
    }
  }
}

export default handler
