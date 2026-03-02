import type { PlasmoMessaging } from "@plasmohq/messaging";
import { quickScore, type QuickScoreResult, ApiError } from "~/lib/api";

export interface QuickScoreRequestBody {
  productId: string;
}

export interface QuickScoreResponseBody {
  success: boolean;
  error?: string;
  data?: QuickScoreResult;
}

const handler: PlasmoMessaging.MessageHandler<
  QuickScoreRequestBody,
  QuickScoreResponseBody
> = async (req, res) => {
  const { productId } = req.body!;

  try {
    const data = await quickScore(productId);
    res.send({ success: true, data });
  } catch (err) {
    if (err instanceof ApiError) {
      res.send({ success: false, error: `${err.status}: ${err.message}` });
    } else {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.send({ success: false, error: message });
    }
  }
};

export default handler;
