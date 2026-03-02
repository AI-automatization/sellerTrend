import { useEffect, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";

import "./style.css";
import LoginForm from "~/components/LoginForm";
import type { AuthStateResponseBody } from "~/background/messages/get-auth-state";
import type { LogoutResponseBody } from "~/background/messages/logout";

const DASHBOARD_URL = process.env.PLASMO_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:5173";

function Popup() {
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthStateResponseBody | null>(null);

  async function checkAuth() {
    try {
      const state = await sendToBackground<Record<string, never>, AuthStateResponseBody>({
        name: "get-auth-state",
        body: {},
      });
      setAuthState(state);
    } catch {
      setAuthState({ isLoggedIn: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  async function handleLogout() {
    await sendToBackground<Record<string, never>, LogoutResponseBody>({
      name: "logout",
      body: {},
    });
    setAuthState({ isLoggedIn: false });
  }

  function handleLoginSuccess() {
    checkAuth();
  }

  if (loading) {
    return (
      <div className="w-72 p-6 flex justify-center">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  if (!authState?.isLoggedIn) {
    return (
      <div className="w-72 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-content font-bold text-sm">V</span>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">VENTRA</h1>
            <p className="text-xs opacity-60">Uzum Analytics</p>
          </div>
        </div>
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="w-72 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-success-content">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">VENTRA</h1>
          <p className="text-xs opacity-60">{authState.email}</p>
        </div>
      </div>

      <div className="divider my-2" />

      <div className="flex flex-col gap-2">
        <a
          href={DASHBOARD_URL}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-sm w-full"
        >
          VENTRA Dashboard
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
            <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
          </svg>
        </a>

        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm w-full text-error"
        >
          Chiqish
        </button>
      </div>
    </div>
  );
}

export default Popup;
