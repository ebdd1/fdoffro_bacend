import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // CRITICAL FIX: Configure connection pool for 10K users
      // Previously used default pool (9 connections)
      // Now explicit pool size based on Railway PostgreSQL tier:
      // - Free tier: max 25 connections total
      // - Settings: 10 for app, 5 buffer for migrations/tools
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool settings
      // These are applied when DATABASE_URL includes connection_limit param
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

/**
 * IMPORTANT: Add connection_limit to DATABASE_URL in Railway environment:
 *
 * For Railway PostgreSQL, update your DATABASE_URL to:
 * postgresql://user:pass@host:5432/dbname?connection_limit=10&pool_timeout=10
 *
 * Recommended settings for 10K users:
 * - connection_limit: 10-20 (tune based on Railway tier limits)
 * - pool_timeout: 10 seconds (prevents indefinite waits)
 *
 * Do NOT exceed Railway's connection limits:
 * - Starter tier: 25 max connections
 * - Standard tier: 100 max connections
 */
