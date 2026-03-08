import type { PlasmoMessaging } from "@plasmohq/messaging"
import { setNotificationsEnabled } from "~/lib/notifications"

export interface SetNotificationSettingsRequestBody {
  enabled: boolean
}

export interface SetNotificationSettingsResponseBody {
  success: boolean
}

const handler: PlasmoMessaging.MessageHandler<
  SetNotificationSettingsRequestBody,
  SetNotificationSettingsResponseBody
> = async (req, res) => {
  const { enabled } = req.body!
  await setNotificationsEnabled(enabled)
  res.send({ success: true })
}

export default handler
