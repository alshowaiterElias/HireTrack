import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReminderType } from '@prisma/client';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    // Get all applications for this user's campaigns to find their reminders
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId },
      select: { id: true },
    });

    const campaignIds = campaigns.map((c) => c.id);

    const applications = await this.prisma.application.findMany({
      where: {
        column: { campaignId: { in: campaignIds } },
      },
      select: { id: true },
    });

    const applicationIds = applications.map((a) => a.id);

    const reminders = await this.prisma.reminder.findMany({
      where: {
        OR: [
          { userId },
          { applicationId: { in: applicationIds } },
        ],
      },
      include: {
        application: {
          select: {
            companyName: true,
            roleTitle: true,
          },
        },
      },
      orderBy: { remindAt: 'asc' },
    });

    this.logger.log(`Found ${reminders.length} reminders for user ${userId}`);
    return reminders;
  }

  async findUpcoming(userId: string) {
    const reminders = await this.findAllForUser(userId);
    return reminders.filter(
      (r) => !r.isSent && !r.isDismissed && new Date(r.remindAt) > new Date(),
    );
  }

  async create(data: {
    userId: string;
    applicationId?: string;
    message: string;
    type: ReminderType;
    remindAt: Date;
  }) {
    const reminder = await this.prisma.reminder.create({
      data: {
        userId: data.userId,
        applicationId: data.applicationId,
        message: data.message,
        type: data.type,
        remindAt: data.remindAt,
      },
      include: {
        application: {
          select: { companyName: true, roleTitle: true },
        },
      },
    });

    this.logger.log(`Created reminder ${reminder.id} (${data.type}) for user ${data.userId}`);
    return reminder;
  }

  async dismiss(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!reminder) throw new NotFoundException('Reminder not found');

    const updated = await this.prisma.reminder.update({
      where: { id },
      data: { isDismissed: true },
    });

    this.logger.log(`Dismissed reminder ${id}`);
    return updated;
  }

  async markSent(id: string) {
    return this.prisma.reminder.update({
      where: { id },
      data: { isSent: true },
    });
  }

  async delete(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId },
    });

    if (!reminder) throw new NotFoundException('Reminder not found');

    await this.prisma.reminder.delete({ where: { id } });
    this.logger.log(`Deleted reminder ${id}`);
    return { success: true };
  }

  // ─── Auto-generated reminders ─────────────────────────────

  private async hasPendingReminder(applicationId: string, type: string): Promise<boolean> {
    const existing = await this.prisma.reminder.findFirst({
      where: { applicationId, type: type as any, isDismissed: false },
    });
    return !!existing;
  }

  private async cancelExistingReminders(applicationId: string, type: string) {
    await this.prisma.reminder.updateMany({
      where: { applicationId, type: type as any, isDismissed: false },
      data: { isDismissed: true },
    });
  }

  async generateFollowUpReminder(applicationId: string, userId: string, companyName: string) {
    if (await this.hasPendingReminder(applicationId, 'FOLLOW_UP')) return null;
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + 7); // 7 days after apply

    return this.create({
      userId,
      applicationId,
      message: `Follow up with ${companyName}? It's been 7 days since you applied.`,
      type: 'FOLLOW_UP',
      remindAt,
    });
  }

  async generateThankYouReminder(applicationId: string, userId: string, companyName: string) {
    if (await this.hasPendingReminder(applicationId, 'THANK_YOU')) return null;
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + 1); // 1 day after phone screen

    return this.create({
      userId,
      applicationId,
      message: `Send a thank-you note to ${companyName} after your phone screen.`,
      type: 'THANK_YOU' as any,
      remindAt,
    });
  }

  async generateInterviewPrepReminder(applicationId: string, userId: string, companyName: string, interviewDate: Date) {
    // Cancel any existing interview prep reminders for this app
    await this.cancelExistingReminders(applicationId, 'INTERVIEW_PREP');
    const remindAt = new Date(interviewDate);
    remindAt.setDate(remindAt.getDate() - 2); // 2 days before interview

    // Only create if remind date is in the future
    if (remindAt <= new Date()) return null;

    return this.create({
      userId,
      applicationId,
      message: `Prep reminder: Interview with ${companyName} in 2 days!`,
      type: 'INTERVIEW_PREP',
      remindAt,
    });
  }

  async generateOfferDeadlineReminder(applicationId: string, userId: string, companyName: string, offerDeadline: Date) {
    // Cancel any existing offer deadline reminders for this app
    await this.cancelExistingReminders(applicationId, 'OFFER_DEADLINE');
    const remindAt = new Date(offerDeadline);
    remindAt.setDate(remindAt.getDate() - 1); // 1 day before deadline

    // Only create if remind date is in the future
    if (remindAt <= new Date()) return null;

    return this.create({
      userId,
      applicationId,
      message: `Offer deadline from ${companyName} is tomorrow! Make your decision.`,
      type: 'OFFER_DEADLINE',
      remindAt,
    });
  }

  async generateStaleCardReminder(applicationId: string, userId: string, companyName: string) {
    // Cancel and re-create (resets the timer)
    await this.cancelExistingReminders(applicationId, 'STALE_CARD');
    const remindAt = new Date();
    remindAt.setDate(remindAt.getDate() + 14); // 14 days no activity

    return this.create({
      userId,
      applicationId,
      message: `You haven't updated ${companyName} in 14 days. Still active?`,
      type: 'STALE_CARD',
      remindAt,
    });
  }

  async cancelStaleReminder(applicationId: string) {
    await this.cancelExistingReminders(applicationId, 'STALE_CARD');
  }
}
