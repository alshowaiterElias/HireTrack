import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsPdfService } from './analytics-pdf.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsPdfService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
