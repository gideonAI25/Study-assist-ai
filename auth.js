/**
 * JWT Authentication Helper & Middleware
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'studymind-jwt-secret-key-2026-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a signed JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware: Requires a valid JWT token
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to proceed.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Your session has expired. Please sign in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token. Please sign in.'
    });
  }
}

/**
 * Optional Auth Middleware: If token provided, populates req.user, otherwise continues
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = {
  generateToken,
  requireAuth,
  optionalAuth
};

