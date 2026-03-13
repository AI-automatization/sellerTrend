import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getTrackedProducts, ApiError } from "~/lib/api"

interface TrackedProductItem {
  product_id: string
  title: string | null
  score: number | null
  weekly_bought: number | null
}

export interface GetTrackedProductsResponseBody {
  success: boolean
  data?: TrackedProductItem[]
  error?: string
}

const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  GetTrackedProductsResponseBody
> = async (_req, res) => {
  try {
    const products = await getTrackedProducts()
    const items: TrackedProductItem[] = products.map((p) => ({
      product_id: p.product_id,
      title: p.title ?? null,
      score: p.score ?? null,
      weekly_bought: p.weekly_bought ?? null,
    }))
    res.send({ success: true, data: items })
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
