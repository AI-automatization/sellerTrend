import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io('/ws', {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}

export function useScoreUpdates(onUpdate: (data: {
  product_id: string;
  score: number;
  weekly_bought: number;
  trend: string;
  updated_at: string;
}) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('score:update', onUpdate);
    return () => { socket.off('score:update', onUpdate); };
  }, [socket, onUpdate]);
}

export function useDiscoveryProgress(onProgress: (data: {
  run_id: string;
  status: string;
  progress: number;
  winners_count: number;
}) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on('discovery:progress', onProgress);
    return () => { socket.off('discovery:progress', onProgress); };
  }, [socket, onProgress]);
}
