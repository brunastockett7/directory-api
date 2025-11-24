// server.js
const path = require('path');

// Load .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db/connect');
const { exec } = require('child_process');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger/swagger.json');
const { auth } = require('express-openid-connect');

const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';

// ──────────────────────────────────────────────
//  TRIM ENV VARIABLES (fixes Render newline/space bugs)
// ──────────────────────────────────────────────
const BASE_URL = (process.env.BASE_URL || '').trim();
const ISSUER_BASE_URL = (process.env.AUTH0_ISSUER_BASE_URL || '').trim();
const AUTH0_CLIENT_ID = (process.env.AUTH0_CLIENT_ID || '').trim();
const AUTH0_SECRET = (process.env.AUTH0_SECRET || '').trim();

// Debug log to confirm final values
console.log('Auth0 config on startup:', {
  BASE_URL,
  AUTH0_ISSUER_BASE_URL: ISSUER_BASE_URL,
  AUTH0_CLIENT_ID_SET: !!AUTH0_CLIENT_ID,
  AUTH0_SECRET_SET: !!AUTH0_SECRET,
});

// ──────────────────────────────────────────────
//  Basic Middleware
// ──────────────────────────────────────────────
app.use(express.json());
app.use(cors());

// ──────────────────────────────────────────────
//  Auth0 Middleware — main OIDC config
// ──────────────────────────────────────────────
app.use(
  auth({
    authRequired: false,          // only protect routes you choose
    auth0Logout: true,            // use Auth0 for logout
    baseURL: BASE_URL,            // must match your Render URL in prod
    clientID: AUTH0_CLIENT_ID,
    issuerBaseURL: ISSUER_BASE_URL,
    secret: AUTH0_SECRET,
  })
);

// 🔹 Explicit LOGIN route (always opens Auth0)
app.get('/login', (req, res) => {
  // If already logged in, just send to Swagger
  if (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) {
    return res.redirect('/api-docs');
  }

  // Otherwise start Auth0 login flow
  return res.oidc.login({
    returnTo: '/api-docs', // after login, go to Swagger UI
  });
});

// 🔹 Explicit LOGOUT route (will redirect back to BASE_URL)
app.get('/logout', (req, res) => {
  return res.oidc.logout(); // Auth0 handles redirect using BASE_URL
});

// Test profile route (protected)
app.get('/profile', (req, res) => {
  if (!req.oidc || !req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  res.json(req.oidc.user);
});

// Dev request log (only in local/dev)
if (!isProd) {
  app.use((req, _res, next) => {
    console.log('> Incoming:', req.method, ' ', req.url);
    next();
  });
}

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// 🔹 HOME route: redirect based on authentication
app.get('/', (req, res) => {
  if (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) {
    // Logged in → go to Swagger docs
    return res.redirect('/api-docs');
  }

  // Not logged in → go to Auth0 login
  return res.redirect('/login');
});

// ──────────────────────────────────────────────
//  API ROUTES
// ──────────────────────────────────────────────
const peopleRoutes = require('./routes/people');
app.use('/api/people', peopleRoutes);

const companiesRoutes = require('./routes/companies');
app.use('/api/companies', companiesRoutes);

// ──────────────────────────────────────────────
//  Open Browser (local only)
// ──────────────────────────────────────────────
function openBrowser(url) {
  if (isProd) return;
  const platform = process.platform;
  if (platform === 'win32') exec(`start "" "${url}"`);
  else if (platform === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

// ──────────────────────────────────────────────
//  Start Server + DB
// ──────────────────────────────────────────────
db.initDb((err) => {
  if (err) {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  }

  const listenArgs = isProd ? [PORT] : [PORT, 'localhost'];

  app.listen(...listenArgs, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🚀 Server running at ${url}`);
    openBrowser(url);
  });
});
