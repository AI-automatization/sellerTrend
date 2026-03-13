import type { PlasmoMessaging } from "@plasmohq/messaging";
import { getTopCategories, ApiError, type CategoryItem } from "~/lib/api";

export interface GetCategoriesResponseBody {
  success: boolean;
  data?: CategoryItem[];
  error?: string;
}

const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  GetCategoriesResponseBody
> = async (_req, res) => {
  try {
    const categories = await getTopCategories();
    res.send({ success: true, data: categories });
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
