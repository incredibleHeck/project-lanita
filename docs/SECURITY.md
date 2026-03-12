# Security

## Rate Limits

The API uses per-IP rate limiting to prevent brute-force and abuse:

| Route | Limit | Notes |
|-------|-------|-------|
| POST /auth/signin | 5 req/min | Brute-force protection |
| POST /auth/signup | 5 req/min | Mass account creation prevention |
| POST /auth/refresh | 10 req/min | Token abuse prevention |
| Other API routes | 100 req/min | General API |
| Webhooks (Paystack, WhatsApp) | SkipThrottle | Validated by signature/verify token |

When a limit is exceeded, the server returns HTTP 429 (Too Many Requests).
