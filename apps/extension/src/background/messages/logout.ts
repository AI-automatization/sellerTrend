import type { PlasmoMessaging } from "@plasmohq/messaging";
import { logout as apiLogout } from "~/lib/api";
import { setBadgeLoggedOut } from "~/lib/badge";
import { notifyLogout } from "~/lib/notifications";

export interface LogoutResponseBody {
  success: boolean;
}

const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  LogoutResponseBody
> = async (_req, res) => {
  try {
    await apiLogout();
    await setBadgeLoggedOut();
    notifyLogout().catch(() => {});
    res.send({ success: true });
  } catch {
    // Even on error, clear local state
    await setBadgeLoggedOut();
    res.send({ success: true });
  }
};

export default handler;
