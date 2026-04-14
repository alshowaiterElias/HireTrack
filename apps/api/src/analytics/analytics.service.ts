import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Conversion Funnel ─────────────────────────────────────
  async getFunnel(userId: string, campaignId?: string) {
    const columns = await this.prisma.column.findMany({
      where: campaignId
        ? { campaignId }
        : { campaign: { userId } },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { position: 'asc' },
    });

    // Aggregate by column name across campaigns
    const aggregated = new Map<string, { name: string; color: string; count: number; position: number }>();
    for (const col of columns) {
      const existing = aggregated.get(col.name);
      if (existing) {
        existing.count += col._count.applications;
        // Keep the lowest position for ordering
        if (col.position < existing.position) {
          existing.position = col.position;
          existing.color = col.color;
        }
      } else {
        aggregated.set(col.name, {
          name: col.name,
          color: col.color,
          count: col._count.applications,
          position: col.position,
        });
      }
    }

    const funnel = Array.from(aggregated.values()).sort((a, b) => a.position - b.position);

    this.logger.log(`Generated funnel for user ${userId}`);
    return funnel;
  }

  // ─── Weekly Activity ───────────────────────────────────────
  async getWeeklyActivity(userId: string, weeks = 12) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const applications = await this.prisma.application.findMany({
      where: {
        column: { campaign: { userId } },
        createdAt: { gte: since },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by week
    const weeklyData: Record<string, number> = {};
    for (const app of applications) {
      const weekStart = getWeekStart(app.createdAt);
      const key = weekStart.toISOString().slice(0, 10);
      weeklyData[key] = (weeklyData[key] || 0) + 1;
    }

    // Fill in empty weeks
    const result = [];
    const current = new Date(since);
    while (current <= new Date()) {
      const weekStart = getWeekStart(current);
      const key = weekStart.toISOString().slice(0, 10);
      result.push({
        week: key,
        count: weeklyData[key] || 0,
      });
      current.setDate(current.getDate() + 7);
    }

    return result;
  }

  // ─── Source Performance ────────────────────────────────────
  async getSourcePerformance(userId: string, campaignId?: string) {
    const where = campaignId
      ? { column: { campaignId } }
      : { column: { campaign: { userId } } };

    const applications = await this.prisma.application.findMany({
      where,
      select: { source: true, column: { select: { name: true, position: true } } },
    });

    // Group by source
    const sourceMap: Record<string, { total: number; responded: number; interviewed: number }> = {};

    for (const app of applications) {
      const source = app.source || 'OTHER';
      if (!sourceMap[source]) {
        sourceMap[source] = { total: 0, responded: 0, interviewed: 0 };
      }
      sourceMap[source].total++;
      // "Responded" = moved beyond first 2 columns (Saved, Applied)
      if (app.column.position > 1) sourceMap[source].responded++;
      // "Interviewed" = moved to position 3+
      if (app.column.position >= 3) sourceMap[source].interviewed++;
    }

    return Object.entries(sourceMap).map(([source, stats]) => ({
      source,
      ...stats,
      responseRate: stats.total > 0 ? Math.round((stats.responded / stats.total) * 100) : 0,
    }));
  }

  // ─── Resume Performance ────────────────────────────────────
  async getResumePerformance(userId: string) {
    const resumes = await this.prisma.resumeVersion.findMany({
      where: { userId },
      include: {
        applications: {
          select: {
            column: { select: { position: true } },
          },
        },
      },
    });

    return resumes.map((resume) => {
      const total = resume.applications.length;
      const responded = resume.applications.filter((a) => a.column.position > 1).length;
      return {
        id: resume.id,
        label: resume.label,
        totalApplications: total,
        responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      };
    });
  }

  // ─── Momentum Score ────────────────────────────────────────
  async getMomentumScore(userId: string) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Activity consistency: apps this week vs last week
    const thisWeekApps = await this.prisma.application.count({
      where: {
        column: { campaign: { userId } },
        createdAt: { gte: oneWeekAgo },
      },
    });

    const lastWeekApps = await this.prisma.application.count({
      where: {
        column: { campaign: { userId } },
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    });

    // Response rate
    const totalApps = await this.prisma.application.count({
      where: { column: { campaign: { userId } } },
    });

    const respondedApps = await this.prisma.application.count({
      where: {
        column: { campaign: { userId }, position: { gt: 1 } },
      },
    });

    // Pipeline balance: spread across stages
    const columns = await this.prisma.column.findMany({
      where: { campaign: { userId } },
      include: { _count: { select: { applications: true } } },
    });

    const columnCounts = columns.map((c) => c._count.applications);
    const maxColumn = Math.max(...columnCounts, 1);
    const avgColumn = columnCounts.reduce((a, b) => a + b, 0) / (columnCounts.length || 1);
    const pipelineBalance = maxColumn > 0 ? avgColumn / maxColumn : 0;

    // Weekly goal achievement
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { weeklyGoal: true },
    });
    const totalWeeklyGoal = campaigns.reduce((sum, c) => sum + c.weeklyGoal, 0) || 10;
    const goalAchievement = Math.min(thisWeekApps / totalWeeklyGoal, 1);

    // Activity consistency
    const activityConsistency = lastWeekApps > 0
      ? Math.min(thisWeekApps / lastWeekApps, 1)
      : thisWeekApps > 0 ? 0.5 : 0;

    // Response rate
    const responseRate = totalApps > 0 ? respondedApps / totalApps : 0;

    // Calculate score (0-100)
    const score = Math.round(
      (activityConsistency * 0.25 +
        responseRate * 0.25 +
        pipelineBalance * 0.20 +
        0.5 * 0.15 + // Follow-up completion placeholder
        goalAchievement * 0.15) *
        100,
    );

    this.logger.log(`Momentum score for user ${userId}: ${score}`);

    return {
      score: Math.min(score, 100),
      breakdown: {
        activityConsistency: Math.round(activityConsistency * 100),
        responseRate: Math.round(responseRate * 100),
        pipelineBalance: Math.round(pipelineBalance * 100),
        followUpCompletion: 50, // Placeholder
        goalAchievement: Math.round(goalAchievement * 100),
      },
      thisWeekApps,
      lastWeekApps,
      totalApps,
      respondedApps,
    };
  }

  // ─── Overview ──────────────────────────────────────────────
  async getOverview(userId: string) {
    const totalApplications = await this.prisma.application.count({
      where: { column: { campaign: { userId } }, isArchived: false },
    });

    const activeInterviews = await this.prisma.application.count({
      where: {
        column: { campaign: { userId }, columnType: { in: ['INTERVIEW', 'PHONE_SCREEN'] } },
        isArchived: false,
      },
    });

    const offers = await this.prisma.application.count({
      where: {
        column: { campaign: { userId }, columnType: 'OFFER' },
        isArchived: false,
      },
    });

    const rejected = await this.prisma.application.count({
      where: {
        column: { campaign: { userId }, columnType: 'REJECTED' },
        isArchived: false,
      },
    });

    const activeCampaigns = await this.prisma.campaign.count({
      where: { userId, status: 'ACTIVE' },
    });

    const archivedApplications = await this.prisma.application.count({
      where: { column: { campaign: { userId } }, isArchived: true },
    });

    return {
      totalApplications,
      activeInterviews,
      offers,
      rejected,
      activeCampaigns,
      archivedApplications,
    };
  }

  // ─── Time in Stage ────────────────────────────────────────
  async getTimeInStage(userId: string) {
    const statusChanges = await this.prisma.statusChange.findMany({
      where: { application: { column: { campaign: { userId } } } },
      orderBy: { changedAt: 'asc' },
      select: {
        applicationId: true,
        fromColumn: true,
        toColumn: true,
        changedAt: true,
      },
    });

    // Group by application, calculate time spent in each stage
    const appTimelines: Record<string, { column: string; enteredAt: Date }[]> = {};
    for (const sc of statusChanges) {
      if (!appTimelines[sc.applicationId]) {
        appTimelines[sc.applicationId] = [];
      }
      appTimelines[sc.applicationId].push({
        column: sc.toColumn,
        enteredAt: sc.changedAt,
      });
    }

    // Calculate average time per stage
    const stageTimes: Record<string, number[]> = {};
    for (const timeline of Object.values(appTimelines)) {
      for (let i = 0; i < timeline.length - 1; i++) {
        const stage = timeline[i].column;
        const entered = timeline[i].enteredAt;
        const left = timeline[i + 1].enteredAt;
        const daysInStage = (left.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24);
        if (!stageTimes[stage]) stageTimes[stage] = [];
        stageTimes[stage].push(daysInStage);
      }
    }

    return Object.entries(stageTimes).map(([stage, times]) => ({
      stage,
      avgDays: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10,
      count: times.length,
    }));
  }

  // ─── Salary Distribution ──────────────────────────────────
  async getSalaryDistribution(userId: string) {
    const applications = await this.prisma.application.findMany({
      where: {
        column: { campaign: { userId } },
        salaryMin: { not: null },
      },
      select: {
        companyName: true,
        roleTitle: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        column: { select: { name: true, columnType: true } },
      },
    });

    return applications.map((app) => ({
      company: app.companyName,
      role: app.roleTitle,
      min: Number(app.salaryMin) || 0,
      max: Number(app.salaryMax) || Number(app.salaryMin) || 0,
      currency: app.currency,
      stage: app.column.name,
    }));
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

