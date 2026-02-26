import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getTokenPayload } from '../api/client';

/**
 * WebSocket "refresh signal" pattern.
 * WS only tells the frontend "something changed" — data is always fetched via REST.
 * This avoids data duplication between WS and REST (single source of truth = REST).
 */

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    const payload = getTokenPayload();
    sharedSocket = io('/ws', {
      transports: ['websocket'],
      autoConnect: true,
      query: { account_id: payload?.account_id ?? '' },
    });
  }
  return sharedSocket;
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

/** Listen for score refresh signals — call `onRefresh` to refetch products via REST */
export function useScoreRefresh(onRefresh: () => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('refresh:score', onRefresh);
    return () => { socket.off('refresh:score', onRefresh); };
  }, [socket, onRefresh]);
}

/** Listen for discovery progress signals */
export function useDiscoveryRefresh(onRefresh: (data: { run_id: string; status: string; progress: number }) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('refresh:discovery', onRefresh);
    return () => { socket.off('refresh:discovery', onRefresh); };
  }, [socket, onRefresh]);
}

/** Listen for notification signals — call `onRefresh` to refetch notifications */
export function useNotificationRefresh(onRefresh: () => void) {
  const { socket } = useSocket();
  const stableCallback = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    if (!socket) return;
    socket.on('refresh:notification', stableCallback);
    return () => { socket.off('refresh:notification', stableCallback); };
  }, [socket, stableCallback]);
}
