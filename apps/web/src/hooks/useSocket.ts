import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getTokenPayload } from '../api/client';
import { useAuthStore } from '../stores/authStore';

/**
 * WebSocket "refresh signal" pattern.
 * WS only tells the frontend "something changed" — data is always fetched via REST.
 * This avoids data duplication between WS and REST (single source of truth = REST).
 */

let sharedSocket: Socket | null = null;
let socketAccountId: string | null = null;

function getSocket(): Socket {
  const payload = getTokenPayload();
  const currentAccountId = payload?.account_id ?? '';

  // Agar boshqa account login qilgan bo'lsa — eski socket'ni yopish
  if (sharedSocket && socketAccountId !== currentAccountId) {
    sharedSocket.disconnect();
    sharedSocket = null;
    socketAccountId = null;
  }

  if (!sharedSocket) {
    sharedSocket = io('/ws', {
      transports: ['websocket'],
      autoConnect: true,
      query: { account_id: currentAccountId },
    });
    socketAccountId = currentAccountId;
  }
  return sharedSocket;
}

/** Logout/401 da chaqiriladi — socket'ni yopadi */
export function disconnectSocket(): void {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    socketAccountId = null;
  }
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket: socketRef.current, connected };
}

/** Listen for score refresh signals — call `onRefresh` to refetch products via REST.
 * Uses useRef to avoid stale closures when callback captures changing state. */
export function useScoreRefresh(onRefresh: () => void) {
  const { socket } = useSocket();
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  useEffect(() => {
    if (!socket) return;
    const handler = () => callbackRef.current();
    socket.on('refresh:score', handler);
    return () => { socket.off('refresh:score', handler); };
  }, [socket]);
}

/** Listen for discovery progress signals.
 * Uses useRef to avoid stale closures. */
export function useDiscoveryRefresh(onRefresh: (data: { run_id: string; status: string; progress: number }) => void) {
  const { socket } = useSocket();
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  useEffect(() => {
    if (!socket) return;
    const handler = (data: { run_id: string; status: string; progress: number }) => callbackRef.current(data);
    socket.on('refresh:discovery', handler);
    return () => { socket.off('refresh:discovery', handler); };
  }, [socket]);
}

/** Listen for notification signals — call `onRefresh` to refetch notifications.
 * Uses useRef to avoid stale closures. */
export function useNotificationRefresh(onRefresh: () => void) {
  const { socket } = useSocket();
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  useEffect(() => {
    if (!socket) return;
    const handler = () => callbackRef.current();
    socket.on('refresh:notification', handler);
    return () => { socket.off('refresh:notification', handler); };
  }, [socket]);
}

// Auto-disconnect when auth tokens are cleared (logout, 401, token expiry)
useAuthStore.subscribe((state, prevState) => {
  if (prevState.accessToken && !state.accessToken) {
    disconnectSocket();
  }
});
