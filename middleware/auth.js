// middleware/auth.js
const { auth } = require("express-openid-connect");

// Helper to make sure environment variables exist
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();  // 👈 FIX: remove hidden spaces/newlines
}

// Auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,

  // Values from Render environment
  secret: requireEnv("AUTH0_SECRET"),
  baseURL: requireEnv("BASE_URL"),
  clientID: requireEnv("AUTH0_CLIENT_ID"),
  issuerBaseURL: requireEnv("AUTH0_ISSUER_BASE_URL"),
};

// Auth0 main middleware
const authMiddleware = auth(config);

// Protect specific routes
const requiresAuth = (req, res, next) => {
  if (!req.oidc || !req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

module.exports = { authMiddleware, requiresAuth };
