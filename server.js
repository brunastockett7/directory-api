// server.js
const path = require('path');
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
//  Trim env vars
// ──────────────────────────────────────────────
const BASE_URL = (process.env.BASE_URL || '').trim();
const ISSUER_BASE_URL = (process.env.AUTH0_ISSUER_BASE_URL || '').trim();
const AUTH0_CLIENT_ID = (process.env.AUTH0_CLIENT_ID || '').trim();
const AUTH0_SECRET = (process.env.AUTH0_SECRET || '').trim();

console.log('Auth0 config:', {
  BASE_URL,
  ISSUER_BASE_URL,
  AUTH0_CLIENT_ID_SET: !!AUTH0_CLIENT_ID,
  AUTH0_SECRET_SET: !!AUTH0_SECRET
});

// ──────────────────────────────────────────────
//  Middleware
// ──────────────────────────────────────────────
app.use(express.json());
app.use(cors());

// Auth0 middleware (handles /login, /logout, /callback under the hood)
app.use(
  auth({
    authRequired: false,
    auth0Logout: true,
    baseURL: BASE_URL,
    clientID: AUTH0_CLIENT_ID,
    issuerBaseURL: ISSUER_BASE_URL,
    secret: AUTH0_SECRET,
  })
);

// Debug helper to see if Auth0 is initializing
app.get('/debug-auth', (req, res) => {
  res.json({
    hasOidc: !!req.oidc,
    isAuthenticated: req.oidc?.isAuthenticated ? req.oidc.isAuthenticated() : null,
  });
});

// Small home page with login / logout links
app.get('/', (req, res) => {
  const isLoggedIn = req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated();
  const statusText = isLoggedIn ? 'Logged in ✅' : 'Logged out ❌';

  res.send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Directory API</title>
      </head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1>Directory API</h1>
        <p>Status: <strong>${statusText}</strong></p>

        ${
          isLoggedIn
            ? `<p><a href="/logout">Logout</a></p>`
            : `<p><a href="/login">Login with Auth0</a></p>`
        }

        <p><a href="/api-docs">Open Swagger Docs</a></p>
      </body>
    </html>
  `);
});

// Optional: force login route to always send you through Auth0
app.get('/login', (req, res) => {
  return res.oidc.login({
    returnTo: '/api-docs',
    authorizationParams: {
      prompt: 'login'   // 👈 always show the login screen
    }
  });
});

// Optional: force logout back to home
app.get('/logout', (req, res) => {
  return res.oidc.logout({ returnTo: BASE_URL });
});

// Swagger docs (some routes will be protected by requiresAuth in your routers)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// API routes
app.use('/api/people', require('./routes/people'));
app.use('/api/companies', require('./routes/companies'));

// ──────────────────────────────────────────────
//  Start DB + Server
// ──────────────────────────────────────────────
db.initDb((err) => {
  if (err) {
    console.error('DB init failed:', err);
    process.exit(1);
  }

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at ${BASE_URL || `http://localhost:${PORT}`}`);
 });

});