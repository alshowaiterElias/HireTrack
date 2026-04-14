import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    const resumes = await this.prisma.resumeVersion.findMany({
      where: { userId },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`Found ${resumes.length} resumes for user ${userId}`);
    return resumes;
  }

  async findOne(id: string, userId: string) {
    const resume = await this.prisma.resumeVersion.findFirst({
      where: { id, userId },
      include: {
        applications: {
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            column: { select: { name: true, position: true } },
          },
        },
      },
    });

    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async create(data: {
    userId: string;
    label: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }) {
    const resume = await this.prisma.resumeVersion.create({
      data: {
        userId: data.userId,
        label: data.label,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
      },
    });

    this.logger.log(`Created resume "${data.label}" (${resume.id}) for user ${data.userId}`);
    return resume;
  }

  async update(id: string, userId: string, data: { label?: string }) {
    const resume = await this.prisma.resumeVersion.findFirst({
      where: { id, userId },
    });

    if (!resume) throw new NotFoundException('Resume not found');

    return this.prisma.resumeVersion.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const resume = await this.prisma.resumeVersion.findFirst({
      where: { id, userId },
    });

    if (!resume) throw new NotFoundException('Resume not found');

    // Check if any applications reference this resume
    const linkedApps = await this.prisma.application.count({
      where: { resumeVersionId: id },
    });

    if (linkedApps > 0) {
      // Unlink applications first
      await this.prisma.application.updateMany({
        where: { resumeVersionId: id },
        data: { resumeVersionId: null },
      });
      this.logger.log(`Unlinked ${linkedApps} applications from resume ${id}`);
    }

    await this.prisma.resumeVersion.delete({ where: { id } });
    this.logger.log(`Deleted resume ${id}`);
    return { success: true };
  }

  // Get performance stats for a specific resume
  async getPerformance(id: string, userId: string) {
    const resume = await this.prisma.resumeVersion.findFirst({
      where: { id, userId },
      include: {
        applications: {
          select: {
            column: { select: { name: true, position: true } },
            source: true,
          },
        },
      },
    });

    if (!resume) throw new NotFoundException('Resume not found');

    const total = resume.applications.length;
    const responded = resume.applications.filter((a) => a.column.position > 1).length;
    const interviewed = resume.applications.filter((a) => a.column.position >= 3).length;

    return {
      id: resume.id,
      label: resume.label,
      totalApplications: total,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      interviewRate: total > 0 ? Math.round((interviewed / total) * 100) : 0,
    };
  }
}
