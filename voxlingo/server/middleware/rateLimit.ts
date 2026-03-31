import { Request, Response, NextFunction } from "express";

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS_PER_MINUTE = 15;

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetAt) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientId = req.ip || "unknown";
  const now = Date.now();
  const entry = requestCounts.get(clientId);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(clientId, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
    return;
  }

  entry.count++;
  next();
}
