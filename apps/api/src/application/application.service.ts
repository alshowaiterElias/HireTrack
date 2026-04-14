import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationSource, Priority, WorkType } from '@prisma/client';
import { ReminderService } from '../reminder/reminder.service';
import { JobDescriptionService } from '../job-description/job-description.service';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderService: ReminderService,
    private readonly jdService: JobDescriptionService,
  ) {}

  private async verifyOwnership(applicationId: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        column: {
          include: { campaign: { select: { userId: true } } },
        },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.column.campaign.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return app;
  }

  async create(
    userId: string,
    data: {
      columnId: string;
      companyName: string;
      roleTitle: string;
      jobUrl?: string;
      jobDescription?: string;
      location?: string;
      workType?: WorkType;
      salaryMin?: number;
      salaryMax?: number;
      currency?: string;
      source?: ApplicationSource;
      priority?: Priority;
      resumeVersionId?: string;
      coverLetter?: string;
      tags?: string[];
      interviewDate?: Date;
      offerDeadline?: Date;
    },
  ) {
    // Verify column ownership
    const column = await this.prisma.column.findUnique({
      where: { id: data.columnId },
      include: { campaign: { select: { userId: true } }, applications: { select: { position: true }, orderBy: { position: 'desc' }, take: 1 } },
    });
    if (!column) throw new NotFoundException('Column not found');
    if (column.campaign.userId !== userId) throw new ForbiddenException('Access denied');

    const nextPosition = (column.applications[0]?.position ?? -1) + 1;

    // Handle tags: find or create
    let tagConnections: { applicationId: string; tagId: string }[] = [];
    if (data.tags && data.tags.length > 0) {
      const tagRecords = await Promise.all(
        data.tags.map((name) =>
          this.prisma.tag.upsert({
            where: { name: name.toLowerCase().trim() },
            create: { name: name.toLowerCase().trim() },
            update: {},
          }),
        ),
      );
      tagConnections = tagRecords.map((t) => ({
        applicationId: '', // will be set after creation
        tagId: t.id,
      }));
    }

    const application = await this.prisma.application.create({
      data: {
        columnId: data.columnId,
        companyName: data.companyName,
        roleTitle: data.roleTitle,
        jobUrl: data.jobUrl,
        jobDescription: data.jobDescription,
        location: data.location,
        workType: data.workType,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        currency: data.currency || 'USD',
        source: data.source,
        priority: data.priority || 'MEDIUM',
        resumeVersionId: data.resumeVersionId,
        coverLetter: data.coverLetter,
        interviewDate: data.interviewDate,
        offerDeadline: data.offerDeadline,
        position: nextPosition,
        tags: tagConnections.length > 0
          ? { create: tagConnections.map((t) => ({ tagId: t.tagId })) }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        contacts: true,
        resumeVersion: { select: { id: true, label: true } },
        column: { select: { columnType: true } },
      },
    });

    // Auto-generate reminders based on column type
    await this.triggerColumnReminders(
      application.id, userId, data.companyName,
      (application.column as any).columnType,
      data.interviewDate, data.offerDeadline,
    );

    // Auto-create JD record if job description text provided.
    // AI analysis (keywords/restructure) is skipped here — trigger it on-demand
    // from the Vault page via the "Re-analyze" button.
    if (data.jobDescription?.trim()) {
      try {
        await this.jdService.createOrUpdate(
          userId, application.id, data.companyName, data.roleTitle,
          data.jobDescription!, data.jobUrl,
          { analyzeWithAi: false },
        );
      } catch (err) {
        console.error('JD auto-creation failed:', err);
      }
    }

    return application;
  }


  async findArchived(userId: string) {
    return this.prisma.application.findMany({
      where: {
        column: { campaign: { userId } },
        isArchived: true,
      },
      include: {
        column: { select: { name: true, color: true } },
        tags: { include: { tag: true } },
        resumeVersion: { select: { id: true, label: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: {
        column: {
          include: { campaign: { select: { userId: true, name: true } } },
        },
        tags: { include: { tag: true } },
        contacts: true,
        notes: { orderBy: { createdAt: 'desc' } },
        statusChanges: { orderBy: { changedAt: 'desc' } },
        reminders: { where: { isDismissed: false }, orderBy: { remindAt: 'asc' } },
        resumeVersion: true,
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!app) throw new NotFoundException('Application not found');
    if (app.column.campaign.userId !== userId) throw new ForbiddenException('Access denied');

    return app;
  }

  async update(
    id: string,
    userId: string,
    data: {
      companyName?: string;
      roleTitle?: string;
      jobUrl?: string;
      jobDescription?: string;
      location?: string;
      workType?: WorkType;
      salaryMin?: number;
      salaryMax?: number;
      currency?: string;
      source?: ApplicationSource;
      priority?: Priority;
      resumeVersionId?: string;
      coverLetter?: string;
      appliedDate?: Date;
      interviewDate?: Date;
      offerDeadline?: Date;
    },
  ) {
    await this.verifyOwnership(id, userId);

    return this.prisma.application.update({
      where: { id },
      data,
      include: {
        tags: { include: { tag: true } },
        contacts: true,
        resumeVersion: { select: { id: true, label: true } },
      },
    });
  }

  async move(
    id: string,
    userId: string,
    data: { columnId: string; position: number; interviewDate?: Date; offerDeadline?: Date },
  ) {
    const app = await this.verifyOwnership(id, userId);

    // Verify target column ownership
    const targetColumn = await this.prisma.column.findUnique({
      where: { id: data.columnId },
      include: { campaign: { select: { userId: true, id: true } } },
    });
    if (!targetColumn) throw new NotFoundException('Target column not found');
    if (targetColumn.campaign.userId !== userId) throw new ForbiddenException('Access denied');

    const fromColumnName = app.column.name;
    const toColumnName = targetColumn.name;

    // Update positions and log status change
    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        columnId: data.columnId,
        position: data.position,
      };
      // Auto-set appliedDate for APPLIED column type
      if ((targetColumn as any).columnType === 'APPLIED' && !app.appliedDate) {
        updateData.appliedDate = new Date();
      }
      // Set interview date if provided
      if (data.interviewDate) {
        updateData.interviewDate = data.interviewDate;
      }
      // Set offer deadline if provided
      if (data.offerDeadline) {
        updateData.offerDeadline = data.offerDeadline;
      }

      const updated = await tx.application.update({
        where: { id },
        data: updateData,
        include: {
          tags: { include: { tag: true } },
          contacts: true,
          resumeVersion: { select: { id: true, label: true } },
        },
      });

      // Log status change if column actually changed
      if (app.columnId !== data.columnId) {
        await tx.statusChange.create({
          data: {
            applicationId: id,
            fromColumn: fromColumnName,
            toColumn: toColumnName,
          },
        });
      }

      return updated;
    });

    // Trigger auto-reminders based on target column type (outside transaction)
    if (app.columnId !== data.columnId) {
      await this.triggerColumnReminders(
        id, userId, app.companyName,
        (targetColumn as any).columnType,
        data.interviewDate, data.offerDeadline,
      );
    }

    return result;
  }


  // ─── Auto-reminder trigger based on column type ─────────────
  private async triggerColumnReminders(
    applicationId: string, userId: string, companyName: string,
    columnType: string, interviewDate?: Date, offerDeadline?: Date,
  ) {
    try {
      switch (columnType) {
        case 'APPLIED':
          await this.reminderService.generateFollowUpReminder(applicationId, userId, companyName);
          break;
        case 'PHONE_SCREEN':
          await this.reminderService.generateThankYouReminder(applicationId, userId, companyName);
          break;
        case 'INTERVIEW':
          if (interviewDate) {
            await this.reminderService.generateInterviewPrepReminder(applicationId, userId, companyName, interviewDate);
          }
          break;
        case 'OFFER':
          if (offerDeadline) {
            await this.reminderService.generateOfferDeadlineReminder(applicationId, userId, companyName, offerDeadline);
          }
          break;
        case 'REJECTED':
          // Terminal state — cancel stale reminders, don't create anything
          await this.reminderService.cancelStaleReminder(applicationId);
          return;
      }

      // Reset the stale card timer only for active pipeline columns (not terminal states)
      // Only generate if not a column that already gets a specific auto-reminder
      const hasSpecificReminder = ['APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER'].includes(columnType);
      if (!hasSpecificReminder) {
        await this.reminderService.generateStaleCardReminder(applicationId, userId, companyName);
      }
    } catch (err) {
      // Don't fail the main operation if reminder creation fails
      console.error('Auto-reminder generation failed:', err);
    }
  }

  async archive(id: string, userId: string, isArchived: boolean) {
    await this.verifyOwnership(id, userId);

    return this.prisma.application.update({
      where: { id },
      data: { isArchived },
    });
  }

  async remove(id: string, userId: string) {
    await this.verifyOwnership(id, userId);
    await this.prisma.application.delete({ where: { id } });
    return { success: true };
  }

  // Notes
  async addNote(
    applicationId: string,
    userId: string,
    data: { content: string; type?: string },
  ) {
    await this.verifyOwnership(applicationId, userId);

    return this.prisma.note.create({
      data: {
        applicationId,
        content: data.content,
        type: (data.type as any) || 'GENERAL',
      },
    });
  }

  // Contacts
  async addContact(
    applicationId: string,
    userId: string,
    data: {
      name: string;
      role?: string;
      email?: string;
      linkedinUrl?: string;
      phone?: string;
      notes?: string;
    },
  ) {
    await this.verifyOwnership(applicationId, userId);

    return this.prisma.contact.create({
      data: { applicationId, ...data },
    });
  }

  async removeContact(applicationId: string, contactId: string, userId: string) {
    await this.verifyOwnership(applicationId, userId);
    await this.prisma.contact.delete({ where: { id: contactId } });
    return { success: true };
  }

  // Find all applications for a user (for dropdowns / duplicate detection)
  async findAll(userId: string, jobUrl?: string) {
    const where: any = {
      column: { campaign: { userId } },
      isArchived: false,
    };
    if (jobUrl) where.jobUrl = jobUrl;

    return this.prisma.application.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        roleTitle: true,
        jobUrl: true,
        source: true,
        column: {
          select: { name: true, color: true, campaign: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: jobUrl ? 1 : 100,
    });
  }

  // Tags
  async addTag(applicationId: string, userId: string, tagName: string) {
    await this.verifyOwnership(applicationId, userId);

    const tag = await this.prisma.tag.upsert({
      where: { name: tagName.toLowerCase().trim() },
      create: { name: tagName.toLowerCase().trim() },
      update: {},
    });

    // Check if already linked
    const existing = await this.prisma.applicationTag.findUnique({
      where: {
        applicationId_tagId: { applicationId, tagId: tag.id },
      },
    });
    if (existing) return { ...existing, tag };

    const appTag = await this.prisma.applicationTag.create({
      data: { applicationId, tagId: tag.id },
      include: { tag: true },
    });
    return appTag;
  }

  async removeTag(applicationId: string, tagId: string, userId: string) {
    await this.verifyOwnership(applicationId, userId);
    await this.prisma.applicationTag.delete({
      where: { applicationId_tagId: { applicationId, tagId } },
    });
    return { success: true };
  }

  // Notes - delete
  async removeNote(applicationId: string, noteId: string, userId: string) {
    await this.verifyOwnership(applicationId, userId);
    await this.prisma.note.delete({ where: { id: noteId } });
    return { success: true };
  }

  // Notes - update
  async updateNote(applicationId: string, noteId: string, userId: string, data: { content?: string; type?: string }) {
    await this.verifyOwnership(applicationId, userId);
    return this.prisma.note.update({ where: { id: noteId }, data: { content: data.content, type: (data.type as any) } });
  }

  // Contacts - update
  async updateContact(applicationId: string, contactId: string, userId: string, data: { name?: string; role?: string; email?: string; linkedinUrl?: string; phone?: string; notes?: string }) {
    await this.verifyOwnership(applicationId, userId);
    return this.prisma.contact.update({ where: { id: contactId }, data });
  }

  // Attachments
  async addAttachment(
    applicationId: string,
    userId: string,
    data: { fileName: string; fileUrl: string; fileSize: number; fileType: string },
  ) {
    await this.verifyOwnership(applicationId, userId);
    return this.prisma.attachment.create({
      data: { applicationId, ...data },
    });
  }

  async removeAttachment(applicationId: string, attachmentId: string, userId: string) {
    await this.verifyOwnership(applicationId, userId);
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { success: true, fileUrl: attachment.fileUrl };
  }
}
