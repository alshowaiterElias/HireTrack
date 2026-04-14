import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignStatus } from '@prisma/client';

const DEFAULT_COLUMNS = [
  { name: 'Saved', color: '#6366f1', position: 0, isDefault: true, columnType: 'SAVED' as const },
  { name: 'Applied', color: '#3b82f6', position: 1, isDefault: false, columnType: 'APPLIED' as const },
  { name: 'Phone Screen', color: '#f59e0b', position: 2, isDefault: false, columnType: 'PHONE_SCREEN' as const },
  { name: 'Interview', color: '#f97316', position: 3, isDefault: false, columnType: 'INTERVIEW' as const },
  { name: 'Offer', color: '#10b981', position: 4, isDefault: false, columnType: 'OFFER' as const },
  { name: 'Rejected', color: '#ef4444', position: 5, isDefault: false, columnType: 'REJECTED' as const },
];

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { userId },
      include: {
        columns: {
          include: {
            _count: {
              select: { applications: { where: { isArchived: false } } },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => ({
      ...c,
      totalApplications: c.columns.reduce(
        (sum, col) => sum + col._count.applications,
        0,
      ),
    }));
  }

  async findOne(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        columns: {
          include: {
            applications: {
              where: { isArchived: false },
              include: {
                tags: { include: { tag: true } },
                contacts: true,
                resumeVersion: { select: { id: true, label: true } },
                _count: { select: { notes: true, reminders: true } },
              },
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return campaign;
  }

  async create(
    userId: string,
    data: {
      name: string;
      goal?: string;
      targetRole?: string;
      salaryMin?: number;
      salaryMax?: number;
      currency?: string;
      targetEndDate?: Date;
      weeklyGoal?: number;
    },
  ) {
    return this.prisma.campaign.create({
      data: {
        userId,
        name: data.name,
        goal: data.goal,
        targetRole: data.targetRole,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        currency: data.currency || 'USD',
        targetEndDate: data.targetEndDate,
        weeklyGoal: data.weeklyGoal || 10,
        columns: {
          create: DEFAULT_COLUMNS,
        },
      },
      include: {
        columns: { orderBy: { position: 'asc' } },
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      name?: string;
      goal?: string;
      targetRole?: string;
      salaryMin?: number;
      salaryMax?: number;
      currency?: string;
      targetEndDate?: Date;
      weeklyGoal?: number;
      status?: CampaignStatus;
    },
  ) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.campaign.update({
      where: { id },
      data,
      include: {
        columns: { orderBy: { position: 'asc' } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { columns: { select: { id: true } } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId) throw new ForbiddenException('Access denied');

    const columnIds = campaign.columns.map((c) => c.id);

    // Cascade: delete applications in columns, then columns, then campaign
    if (columnIds.length > 0) {
      // Delete application-related data first
      await this.prisma.note.deleteMany({
        where: { application: { columnId: { in: columnIds } } },
      });
      await this.prisma.contact.deleteMany({
        where: { application: { columnId: { in: columnIds } } },
      });
      await this.prisma.reminder.deleteMany({
        where: { application: { columnId: { in: columnIds } } },
      });
      await this.prisma.applicationTag.deleteMany({
        where: { application: { columnId: { in: columnIds } } },
      });
      await this.prisma.application.deleteMany({
        where: { columnId: { in: columnIds } },
      });
      await this.prisma.column.deleteMany({
        where: { id: { in: columnIds } },
      });
    }

    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }

  // Column management
  async addColumn(campaignId: string, userId: string, data: { name: string; color?: string; columnType?: string }) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { columns: { orderBy: { position: 'desc' }, take: 1 } },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId) throw new ForbiddenException('Access denied');

    const nextPosition = (campaign.columns[0]?.position ?? -1) + 1;

    return this.prisma.column.create({
      data: {
        campaignId,
        name: data.name,
        color: data.color || '#6366f1',
        position: nextPosition,
        columnType: (data.columnType as any) || 'CUSTOM',
      },
    });
  }

  async updateColumn(
    columnId: string,
    userId: string,
    data: { name?: string; color?: string; position?: number; wipLimit?: number | null; columnType?: string },
  ) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { campaign: { select: { userId: true } } },
    });
    if (!column) throw new NotFoundException('Column not found');
    if (column.campaign.userId !== userId) throw new ForbiddenException('Access denied');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.wipLimit !== undefined) updateData.wipLimit = data.wipLimit;
    if (data.columnType !== undefined) updateData.columnType = data.columnType;

    return this.prisma.column.update({
      where: { id: columnId },
      data: updateData,
    });
  }

  async removeColumn(columnId: string, userId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: {
        campaign: { select: { userId: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!column) throw new NotFoundException('Column not found');
    if (column.campaign.userId !== userId) throw new ForbiddenException('Access denied');
    if (column._count.applications > 0) {
      throw new ForbiddenException('Cannot delete a column that contains applications. Move or delete them first.');
    }

    await this.prisma.column.delete({ where: { id: columnId } });
    return { success: true };
  }

  async reorderColumns(campaignId: string, userId: string, columnIds: string[]) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.$transaction(
      columnIds.map((id, index) =>
        this.prisma.column.update({ where: { id }, data: { position: index } }),
      ),
    );

    return { success: true };
  }
}
