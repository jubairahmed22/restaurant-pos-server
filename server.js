// ── cPanel Entry Point ────────────────────────────────────
// cPanel Phusion Passenger looks for this file at the application root.
// It simply delegates to the real server inside src/.
require('./src/server.js');
