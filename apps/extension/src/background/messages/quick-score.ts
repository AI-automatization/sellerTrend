import type { PlasmoMessaging } from "@plasmohq/messaging";
import { quickScore, type QuickScoreResult, ApiError } from "~/lib/api";
import { fetchUzumProduct, type UzumProductData } from "~/lib/uzum-api";

export interface QuickScoreRequestBody {
  productId: string;
}

export interface QuickScoreResponseBody {
  success: boolean;
  error?: string;
  data?: QuickScoreResult;
  uzumData?: UzumProductData;
}

const handler: PlasmoMessaging.MessageHandler<
  QuickScoreRequestBody,
  QuickScoreResponseBody
> = async (req, res) => {
  const { productId } = req.body!;

  // Fetch VENTRA score and uzum.uz data in parallel
  const [ventраResult, uzumData] = await Promise.allSettled([
    quickScore(productId),
    fetchUzumProduct(productId),
  ]);

  const uzum =
    uzumData.status === "fulfilled" ? uzumData.value : null;

  if (ventраResult.status === "fulfilled") {
    res.send({ success: true, data: ventраResult.value, uzumData: uzum ?? undefined });
    return;
  }

  // VENTRA failed — check if uzum.uz has data
  if (uzum) {
    res.send({ success: true, data: undefined, uzumData: uzum });
    return;
  }

  // Both failed
  const err = ventраResult.reason;
  if (err instanceof ApiError) {
    res.send({ success: false, error: `${err.status}: ${err.message}` });
  } else {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.send({ success: false, error: message });
  }
};

export default handler;
