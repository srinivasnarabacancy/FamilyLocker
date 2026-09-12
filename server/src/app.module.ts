import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { PrismaService } from './common/prisma.service';
import { StorageService } from './common/storage.service';
import { StorageController } from './common/storage.controller';
import { ActivityLogService } from './common/activity-log.service';
import { ThrottleGuard } from './common/throttle.guard';
import { MailService } from './mail/mail.service';
import { AuthService } from './auth/auth.service';
import { RegistrationService } from './auth/registration.service';
import { TokenService } from './auth/token.service';
import { AuthGuard, VerifiedGuard } from './auth/auth.guard';
import { AuthController } from './auth/auth.controller';
import { DocumentsController } from './modules/documents/documents.controller';
import { ExpensesController } from './modules/expenses/expenses.controller';
import { MedicalController } from './modules/medical/medical.controller';
import { AlbumsController } from './modules/albums/albums.controller';
import { BillsController } from './modules/bills/bills.controller';
import { TasksController } from './modules/tasks/tasks.controller';
import { RemindersController } from './modules/reminders/reminders.controller';
import { FamilyController } from './modules/family/family.controller';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { CronController } from './modules/cron/cron.controller';
import { SendRemindersService } from './modules/cron/send-reminders.service';

/**
 * Single root module. The app is small enough that per-feature modules would
 * add ceremony without buying isolation; controllers stay one-per-Laravel-
 * controller so the mapping to the PHP source is obvious.
 */
@Module({
  imports: [
    MulterModule.register({
      // Files are buffered in memory and handed to StorageService, which may
      // forward them to Supabase — writing to local disk first would not work
      // on a read-only serverless filesystem.
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  ],
  controllers: [
    StorageController,
    AuthController,
    DashboardController,
    FamilyController,
    DocumentsController,
    ExpensesController,
    MedicalController,
    AlbumsController,
    BillsController,
    TasksController,
    RemindersController,
    CronController,
  ],
  providers: [
    PrismaService,
    StorageService,
    ActivityLogService,
    MailService,
    AuthService,
    RegistrationService,
    TokenService,
    AuthGuard,
    VerifiedGuard,
    SendRemindersService,
    // DashboardController reuses the expense aggregation helper.
    ExpensesController,
    { provide: APP_GUARD, useClass: ThrottleGuard },
  ],
})
export class AppModule {}
