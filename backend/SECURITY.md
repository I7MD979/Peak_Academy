# Peak Academy — Security Policy

## Standards Implemented
- **OWASP Top 10 2021** — A01-A10 covered
- **NIST SP 800-53 Rev 5** — AC, AU, SC, SI controls
- **CWE/SANS Top 25** — CWE-20, CWE-79, CWE-89, CWE-22, CWE-284

## Controls Summary

| OWASP | Risk | Control |
|-------|------|---------|
| A01 | Broken Access Control | selfOnly(), requireRole(), validateUUID() |
| A02 | Cryptographic Failures | HTTPS enforced, HSTS, Supabase JWT |
| A03 | Injection | sanitizeInput(), blockSQLInjection(), Zod validation |
| A04 | Insecure Design | validateUUID(), input length limits |
| A05 | Misconfiguration | Helmet CSP, securityHeaders(), error sanitization |
| A06 | Vulnerable Components | npm audit in CI |
| A07 | Auth Failures | authLimiter (10/15min), slowDown, uniform responses |
| A08 | Data Integrity | Paymob HMAC verification (timing-safe), replay protection |
| A09 | Logging & Monitoring | securityLogger(), Sentry, security_audit_log table |
| A10 | SSRF | blockSSRF() — blocks internal IPs & metadata endpoints |

## OAuth & Payments
- Custom Google OAuth via backend (`/api/auth/google`) — hides Supabase URL on consent screen
- Google OAuth email validation, open-redirect blocking, OAuth rate limits
- Paymob webhook: strict HMAC, transaction validation, replay cache (in-memory; use Redis in production)

## Reporting
security@peak-academy.net
