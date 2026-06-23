# Railway Environment Variables Setup

## Critical Configuration for 10K Users

This document contains the required environment variables for the KostFind backend to handle 10,000 registered users.

---

## Required Variables

### 1. DATABASE_URL (CRITICAL)

**Format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?connection_limit=10&pool_timeout=10
```

**Example:**
```
postgresql://kostfind_user:kostfind_pass@containers.us.railway.app:5432/railway?connection_limit=10&pool_timeout=10
```

**Settings:**
- `connection_limit=10` — Number of concurrent DB connections from Prisma
- `pool_timeout=10` — Seconds to wait for available connection before error

**Why this matters:**
- Default Prisma pool: 9 connections (based on CPU cores)
- With 300 concurrent users, each making ~50ms queries = 150 req/s potential
- Without proper limit, Railway PostgreSQL will reject new connections
- Too high limit causes "too many connections" error

**Railway PostgreSQL Limits:**
| Tier | Max Connections |
|------|----------------|
| Free/Starter | 25 |
| Standard | 100 |
| Pro | 500 |

**Recommendation:** Start with `connection_limit=10` and monitor. Scale up if seeing connection pool exhaustion errors.

---

### 2. REDIS_URL (HIGH PRIORITY)

**Format:**
```
redis://USER:PASSWORD@HOST:PORT
```

**Example:**
```
redis://default:abc123@containers.us.railway.app:6379
```

**Why this matters:**
- Socket.IO horizontal scaling (multiple Railway instances)
- Presence tracking across instances
- Session management
- Without Redis, only single-instance deployment

**Cost:** Railway Redis starts at $5/month

---

### 3. JWT_SECRET (CRITICAL)

**Format:**
```
JWT_SECRET=your-super-secret-key-at-least-32-chars
```

**Requirements:**
- Minimum 32 characters
- Random, unpredictable value
- Use: `openssl rand -base64 32`

**Important:**
- Generate NEW secret for production
- Do NOT use the same secret as development
- Rotate every 90 days

---

### 4. NODE_ENV

**Format:**
```
NODE_ENV=production
```

**Required for:**
- Disable debug logging
- Show generic error messages
- Enable production optimizations

---

## Railway CLI Commands

### Set Environment Variables

```bash
# Navigate to backend directory
cd kostfind_api

# Set DATABASE_URL with connection pool
railway variables set DATABASE_URL="postgresql://USER:PASS@HOST:PORT/DB?connection_limit=10&pool_timeout=10"

# Set REDIS_URL
railway variables set REDIS_URL="redis://default:PASS@HOST:PORT"

# Set JWT_SECRET
railway variables set JWT_SECRET="$(openssl rand -base64 32)"

# Set NODE_ENV
railway variables set NODE_ENV="production"
```

### Verify Variables

```bash
railway variables
```

### Restart Service

```bash
railway up
```

---

## Monitoring Connection Pool Health

### Check Railway Logs

```bash
railway logs --tail 100
```

Look for:
- `PrismaClientKnownRequestError` with `P2024` (connection pool timeout)
- `Connection timeout` errors
- High response latency

### Signs of Pool Exhaustion

1. **P2024 Error Code:**
   ```
   PrismaClientKnownRequestError: P2024: Connection pool timeout
   ```

2. **High CPU but low throughput:**
   - Workers waiting for connections instead of processing

3. **Timeouts increase over time:**
   - Starts fine, degrades over hours

### Solutions

1. **Increase connection_limit (if under Railway limits):**
   ```
   ?connection_limit=15
   ```

2. **Add PgBouncer (connection pooling layer):**
   - Railway PostgreSQL doesn't support PgBouncer
   - Consider Upstash Redis or dedicated PostgreSQL provider

3. **Reduce query time:**
   - Add indexes
   - Optimize slow queries

---

## Complete Railway Setup Checklist

- [ ] Set `DATABASE_URL` with `?connection_limit=10&pool_timeout=10`
- [ ] Set `REDIS_URL` for Socket.IO scaling
- [ ] Set `JWT_SECRET` (32+ random characters)
- [ ] Set `NODE_ENV=production`
- [ ] Verify variables: `railway variables`
- [ ] Redeploy: `railway up`
- [ ] Check logs for errors
- [ ] Test under load

---

## Cost Summary (10K Users)

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway Compute | Starter | $5 |
| Railway PostgreSQL | Starter | $5 |
| Railway Redis | Starter | $5 |
| **Total Backend** | | **$15/mo** |

**Note:** Prices may vary. Check Railway pricing for current rates.
