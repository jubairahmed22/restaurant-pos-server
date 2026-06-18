require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets/socketServer');

const PORT = process.env.PORT || 51000;

// Connect to Database
connectDB();asdfsadf

// Create HTTP Server
const server = http.createServer(app);

// Initialise real-time engine
initSocket(server);

// Boot server instance
server.listen(PORT, () => {
  console.log(`🚀 Server up and running in production blueprint on port: ${PORT}`);
});

// Handle unhandled promise rejections safely
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});