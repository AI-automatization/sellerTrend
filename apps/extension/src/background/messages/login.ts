import type { PlasmoMessaging } from "@plasmohq/messaging";
import { login as apiLogin, type LoginResult } from "~/lib/api";
import { setBadgeCount } from "~/lib/badge";
import { notifyLogin } from "~/lib/notifications";

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginResponseBody {
  success: boolean;
  error?: string;
  data?: LoginResult;
}

const handler: PlasmoMessaging.MessageHandler<
  LoginRequestBody,
  LoginResponseBody
> = async (req, res) => {
  const { email, password } = req.body!;

  try {
    const result = await apiLogin(email, password);
    await setBadgeCount(0);
    notifyLogin(email).catch(() => {});
    res.send({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.send({ success: false, error: message });
  }
};

export default handler;
