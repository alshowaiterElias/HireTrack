import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPdfService } from './analytics-pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly analyticsPdfService: AnalyticsPdfService,
  ) {}

  @Get('export/pdf')
  async exportPdf(@Req() req: any, @Res() res: Response) {
    const pdf = await this.analyticsPdfService.generateReport(req.user.sub);
    const filename = `hiretrack-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  }

  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.analyticsService.getOverview(req.user.sub);
  }

  @Get('funnel')
  async getFunnel(@Req() req: any, @Query('campaignId') campaignId?: string) {
    return this.analyticsService.getFunnel(req.user.sub, campaignId);
  }

  @Get('activity')
  async getActivity(@Req() req: any, @Query('weeks') weeks?: string) {
    return this.analyticsService.getWeeklyActivity(
      req.user.sub,
      weeks ? parseInt(weeks, 10) : 12,
    );
  }

  @Get('sources')
  async getSources(@Req() req: any, @Query('campaignId') campaignId?: string) {
    return this.analyticsService.getSourcePerformance(req.user.sub, campaignId);
  }

  @Get('resumes')
  async getResumes(@Req() req: any) {
    return this.analyticsService.getResumePerformance(req.user.sub);
  }

  @Get('momentum')
  async getMomentum(@Req() req: any) {
    return this.analyticsService.getMomentumScore(req.user.sub);
  }

  @Get('time-in-stage')
  async getTimeInStage(@Req() req: any) {
    return this.analyticsService.getTimeInStage(req.user.sub);
  }

  @Get('salary')
  async getSalary(@Req() req: any) {
    return this.analyticsService.getSalaryDistribution(req.user.sub);
  }
}

