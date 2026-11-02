import { io } from 'socket.io-client';
import { getBackendServerUrl } from './api';

let socket = null;

export function initSocket(clubId, onConnected, onDisconnect) {
  if (socket) {
    socket.disconnect();
  }

  const serverUrl = getBackendServerUrl();

  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('📡 Connected to Club Live Socket Gateway:', socket.id, 'at', serverUrl);
    socket.emit('join', {
      clubId: clubId || 'club_akgec_aws_01',
      role: 'admin',
    });
    if (onConnected) onConnected();
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Disconnected from Socket Gateway:', reason);
    if (onDisconnect) onDisconnect(reason);
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

