import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { SendRemindersService } from '../modules/cron/send-reminders.service';

/**
 * Standalone equivalent of `php artisan reminders:notify`, for running the job
 * from a real scheduler (cron, systemd timer, GitHub Actions) instead of the
 * HTTP endpoint. Pass `--dry-run` to log without sending.
 *
 *   node dist/cron/send-reminders.js --dry-run
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'warn', 'error'] });

  try {
    const output = await app.get(SendRemindersService).run(process.argv.includes('--dry-run'));
    process.stdout.write(`${output.join('\n')}\n`);
  } catch (err) {
    new Logger('reminders:notify').error(err instanceof Error ? err.stack : String(err));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
