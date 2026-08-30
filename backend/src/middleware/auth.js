const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'skillforge_super_secret_jwt_key_2026';

/**
 * Strict authentication middleware — rejects request with 401 if no valid token
 */
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
  }
};

/**
 * Optional authentication middleware — populates req.user if valid token provided,
 * but allows unauthenticated requests to continue (req.user = null)
 */
const optionalAuth = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

module.exports = { protect, optionalAuth, JWT_SECRET };
