# Redis Setup untuk Horizontal Scaling (Railway)

## Kenapa Redis Adapter Diperlukan?

Socket.IO default adapter adalah **in-memory** — hanya jalan di 1 instance.

**Tanpa Redis:**
- User A connect ke instance 1
- User B connect ke instance 2 (Railway auto-scale)
- User A kirim pesan → User B **TIDAK TERIMA** (instance tidak sync)

**Dengan Redis:**
- Semua instance sync via Redis pub/sub
- User A di instance 1 → User B di instance 2 tetap terima realtime

---

## Setup di Railway (Production)

### 1. Tambah Redis Service

Railway Dashboard → Project → **New** → **Database** → **Redis**

Railway akan provision Redis instance dan auto-generate `REDIS_URL`.

### 2. Link Redis ke Backend Service

Railway Dashboard → Backend Service → **Variables** → tambahkan:

```
REDIS_URL = ${{Redis.REDIS_URL}}
```

Railway akan auto-resolve reference ke Redis internal URL.

### 3. Redeploy Backend

Push commit ini → Railway auto-deploy dengan Redis adapter enabled.

**Verify di logs:**
```
[Socket.IO] Redis adapter initialized for horizontal scaling
```

---

## Setup Local Development (Optional)

### Option A: Tanpa Redis (Single Instance)

Tidak perlu apa-apa. Backend auto fallback ke in-memory adapter.

**Log:**
```
[Socket.IO] REDIS_URL not set — using in-memory adapter (single instance only)
```

### Option B: Dengan Redis (Test Multi-Instance)

Install Redis lokal:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis
```

Tambah `.env`:
```
REDIS_URL=redis://localhost:6379
```

---

## Verification Checklist

✅ Redis service running di Railway  
✅ `REDIS_URL` env var set di backend service  
✅ Backend log show "Redis adapter initialized"  
✅ Test: buka 2 browser, chat tetap sync (meskipun hit different instances)

---

## Troubleshooting

**Error: Redis connection refused**
- Cek Redis service status di Railway Dashboard
- Verify `REDIS_URL` format correct: `redis://default:password@host:port`

**Chat tidak sync antar instance**
- Cek backend logs: jika fallback ke in-memory, Redis tidak connected
- Verify Railway service linking (Redis.REDIS_URL reference)

**Redis OOM (Out of Memory)**
- Redis default = in-memory storage untuk pub/sub saja, minimal memory usage
- Jika OOM: upgrade Redis plan di Railway atau tambah TTL eviction policy
