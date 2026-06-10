const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  // Build allowed origins from env — same list as app.js CORS
  const allowedOrigins = [
    'http://localhost:3000',
    'https://rin-frontend.vercel.app/',
    'http://127.0.0.1:3000',
    'http://localhost:51000',
    'http://ortazz.com.au',
    ...(process.env.CLIENT_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Socket CORS: ${origin} not allowed`));
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
    // Polling first (works without WebSocket upgrade in shared hosting),
    // then upgrades to WebSocket when available.
    transports: ['polling', 'websocket'],
    allowEIO3: true,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Single room join
    socket.on('join-room', (roomName) => {
      socket.join(roomName);
      console.log(`👤 ${socket.id} → room: ${roomName}`);
    });

    // Join multiple rooms at once (e.g. ['admin-room', 'kitchen-room'])
    socket.on('join-rooms', (rooms = []) => {
      rooms.forEach(r => socket.join(r));
      console.log(`👤 ${socket.id} → rooms: ${rooms.join(', ')}`);
    });

    // Staff joins a dedicated table session room
    socket.on('join-table-session', (tableId) => {
      socket.join(`table:${tableId}`);
      console.log(`🍽️  ${socket.id} → table session: ${tableId}`);
    });

    socket.on('leave-table-session', (tableId) => {
      socket.leave(`table:${tableId}`);
    });

    // Kitchen display marks an item ready — relay to staff
    socket.on('kitchen:itemReady', ({ sessionId, itemId }) => {
      io.to('admin-room').emit('session:itemReady', { sessionId, itemId });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
};

// Emit to staff watching a specific table
const emitToTable = (tableId, event, data) => {
  if (!io) return;
  io.to(`table:${tableId}`).emit(event, data);
};

module.exports = { initSocket, getIO, emitToTable };