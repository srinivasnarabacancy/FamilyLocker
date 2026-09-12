import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { SendRemindersService } from './send-reminders.service';
import { success } from '../../common/laravel';
import { UnauthorizedException } from '../../common/errors';

/** Port of App\Http\Controllers\Api\CronController. */
@Controller('cron')
export class CronController {
  constructor(private readonly reminders: SendRemindersService) {}

  /**
   * Invoked daily by Vercel's scheduler (vercel.json), authenticated with the
   * shared CRON_SECRET it sends as a bearer token.
   */
  @Get('reminders')
  async sendReminders(@Req() req: Request) {
    const secret = process.env.CRON_SECRET;
    const header = req.headers.authorization ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!secret || !this.secretMatches(secret, provided)) {
      throw new UnauthorizedException('Unauthorized');
    }

    const output = await this.reminders.run();

    return success({ output: output.join('\n') }, 'Reminder notifications dispatched');
  }

  /** Constant-time compare so the secret cannot be probed byte by byte. */
  private secretMatches(expected: string, provided: string): boolean {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
