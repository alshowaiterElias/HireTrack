import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CampaignModule } from './campaign/campaign.module';
import { ApplicationModule } from './application/application.module';
import { ReminderModule } from './reminder/reminder.module';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ResumeModule } from './resume/resume.module';
import { EmailTemplateModule } from './email-template/email-template.module';
import { AiModule } from './ai/ai.module';
import { JobDescriptionModule } from './job-description/job-description.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core modules
    PrismaModule,
    AuthModule,
    CampaignModule,
    ApplicationModule,
    ReminderModule,
    NotificationModule,
    AnalyticsModule,
    ResumeModule,
    EmailTemplateModule,
    AiModule,
    JobDescriptionModule,
    StorageModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log('╔══════════════════════════════════════════╗');
    this.logger.log('║        HireTrack API — Modules Loaded    ║');
    this.logger.log('╠══════════════════════════════════════════╣');
    this.logger.log('║  ✅ Auth (OAuth + Email OTP)             ║');
    this.logger.log('║  ✅ Campaign (CRUD + Columns)            ║');
    this.logger.log('║  ✅ Application (CRUD + Move + Archive)  ║');
    this.logger.log('║  ✅ Reminder (CRUD + Auto-generate)      ║');
    this.logger.log('║  ✅ Notification (CRUD + Read/Unread)    ║');
    this.logger.log('║  ✅ Analytics (Funnel + Momentum)        ║');
    this.logger.log('║  ✅ Resume (CRUD + Performance)          ║');
    this.logger.log('║  ✅ Email Template (CRUD + Render)       ║');
    this.logger.log('║  ✅ AI (OpenAI JD Analysis)              ║');
    this.logger.log('║  ✅ JD Vault (CRUD + Search + PDF)       ║');
    this.logger.log('╚══════════════════════════════════════════╝');
  }
}
