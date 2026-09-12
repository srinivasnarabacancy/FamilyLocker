import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

/** Port of BaseApiController::logActivity. */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: bigint,
    familyId: bigint,
    module: string,
    action: string,
    description: string,
    meta: Prisma.InputJsonValue = {},
  ): Promise<void> {
    const now = new Date();

    try {
      await this.prisma.activityLog.create({
        data: { userId, familyId, module, action, description, meta, createdAt: now, updatedAt: now },
      });
    } catch (err: any) {
      // Activity logging is observability, never a reason to fail the request.
      this.logger.warn(`Activity log failed (${module}/${action}): ${err?.message ?? err}`);
    }
  }
}
