import type { PlasmoMessaging } from "@plasmohq/messaging";
import {
  getAccessToken,
  isTokenExpired,
  decodeToken,
  type JwtTokenPayload,
} from "~/lib/storage";

export interface AuthStateResponseBody {
  isLoggedIn: boolean;
  email?: string;
  role?: string;
  payload?: JwtTokenPayload;
}

const handler: PlasmoMessaging.MessageHandler<
  Record<string, never>,
  AuthStateResponseBody
> = async (_req, res) => {
  const token = await getAccessToken();

  if (!token || isTokenExpired(token)) {
    res.send({ isLoggedIn: false });
    return;
  }

  const payload = decodeToken(token);
  if (!payload) {
    res.send({ isLoggedIn: false });
    return;
  }

  res.send({
    isLoggedIn: true,
    email: payload.email,
    role: payload.role,
    payload,
  });
};

export default handler;
