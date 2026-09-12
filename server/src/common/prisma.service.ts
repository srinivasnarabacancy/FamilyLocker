import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Supabase is reached through PgBouncer in TRANSACTION mode (port 6543).
 * Server-side prepared statements are not usable there — the pooler may hand
 * the next query to a different backend, producing intermittent
 * "prepared statement \"s0\" already exists" errors under load.
 *
 * Put `?pgbouncer=true&connection_limit=1` on DATABASE_URL. Long-running
 * migrations or introspection must use the DIRECT connection (port 5432)
 * instead — see DIRECT_URL in .env.example.
 *
 * This replaces App\Database\PostgresConnection: the boolean-literal hack that
 * Laravel needed under PDO::ATTR_EMULATE_PREPARES is unnecessary because the
 * `pg` driver binds booleans natively.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }] });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
