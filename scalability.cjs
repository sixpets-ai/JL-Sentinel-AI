// SANTI NEXUS - SISTEMA DE ESCALABILIDAD
// Rate limiting, queue management, connection pooling
// Aplica como middleware en server.js

const RATE_LIMITS = new Map();
const REQUEST_QUEUE = [];
const MAX_QUEUE_SIZE = 1000;
const MAX_REQUESTS_PER_MIN = 300;
const MAX_CONCURRENT = 50;
let activeRequests = 0;

function rateLimit(clientId) {
  const now = Date.now();
  const windowMs = 60000;
  if (!RATE_LIMITS.has(clientId)) {
    RATE_LIMITS.set(clientId, { count: 0, resetAt: now + windowMs });
  }
  const limit = RATE_LIMITS.get(clientId);
  if (now > limit.resetAt) {
    limit.count = 0;
    limit.resetAt = now + windowMs;
  }
  limit.count++;
  return limit.count <= MAX_REQUESTS_PER_MIN;
}

function queueMiddleware(req, res, next) {
  const clientId = req.ip || 'unknown';
  if (!rateLimit(clientId)) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: 60 });
  }
  if (activeRequests >= MAX_CONCURRENT) {
    if (REQUEST_QUEUE.length >= MAX_QUEUE_SIZE) {
      return res.status(503).json({ error: 'Sistema bajo carga máxima, reintenta en segundos' });
    }
    REQUEST_QUEUE.push({ req, res, next, time: Date.now() });
    return;
  }
  activeRequests++;
  const done = res.on ? res.on.bind(res) : null;
  res.on('finish', () => {
    activeRequests--;
    processQueue();
  });
  next();
}

function processQueue() {
  if (REQUEST_QUEUE.length === 0 || activeRequests >= MAX_CONCURRENT) return;
  const item = REQUEST_QUEUE.shift();
  if (!item) return;
  if (Date.now() - item.time > 30000) {
    item.res.status(408).json({ error: 'Request timeout en cola' });
    processQueue();
    return;
  }
  activeRequests++;
  item.res.on('finish', () => { activeRequests--; processQueue(); });
  item.next();
}

// Limpiar rate limits expirados cada 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of RATE_LIMITS.entries()) {
    if (now > val.resetAt + 60000) RATE_LIMITS.delete(key);
  }
}, 300000);

module.exports = { queueMiddleware, rateLimit };
console.log('[SCALABILITY] Sistema de escalabilidad cargado');
