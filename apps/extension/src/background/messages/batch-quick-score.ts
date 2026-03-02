import type { PlasmoMessaging } from "@plasmohq/messaging"
import { batchQuickScore, type BatchQuickScoreItem, ApiError } from "~/lib/api"

export interface BatchQuickScoreRequestBody {
  productIds: string[]
}

export interface BatchQuickScoreResponseBody {
  success: boolean
  results?: BatchQuickScoreItem[]
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  BatchQuickScoreRequestBody,
  BatchQuickScoreResponseBody
> = async (req, res) => {
  const { productIds } = req.body!

  if (!productIds || productIds.length === 0) {
    res.send({ success: true, results: [] })
    return
  }

  try {
    const data = await batchQuickScore(productIds)
    res.send({ success: true, results: data.results })
  } catch (err) {
    if (err instanceof ApiError) {
      res.send({ success: false, error: `${err.status}: ${err.message}` })
    } else {
      const message = err instanceof Error ? err.message : "Unknown error"
      res.send({ success: false, error: message })
    }
  }
}

export default handler
