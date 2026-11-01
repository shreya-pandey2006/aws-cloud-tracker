import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:5000'
    : window.location.origin);

let socket = null;

export function initSocket(clubId, onConnected) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('📡 Connected to Club Live Socket Gateway:', socket.id);
    socket.emit('join', {
      clubId: clubId || 'club_akgec_aws_01',
      role: 'admin',
    });
    if (onConnected) onConnected();
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Disconnected from Socket Gateway:', reason);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

