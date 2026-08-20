import { io, type Socket } from 'socket.io-client';
import { API_BASE, getToken } from './api';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket | null> {
  const token = await getToken();
  if (!token) return null;
  if (socket?.connected) return socket;
  socket = io(API_BASE, { path: '/ws', auth: { token }, transports: ['websocket'], reconnection: true });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function onEvent(event: string, handler: (payload: any) => void) {
  socket?.on(event, handler);
  return () => { socket?.off(event, handler); };
}

export const getSocket = () => socket;
