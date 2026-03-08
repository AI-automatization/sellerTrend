import type { PlasmoMessaging } from "@plasmohq/messaging"
import { getNotificationsEnabled } from "~/lib/notifications"

export interface NotificationSettingsResponseBody {
  enabled: boolean
}

const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  NotificationSettingsResponseBody
> = async (_req, res) => {
  const enabled = await getNotificationsEnabled()
  res.send({ enabled })
}

export default handler
