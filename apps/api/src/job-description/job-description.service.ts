import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class JobDescriptionService {
  private readonly logger = new Logger(JobDescriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async findAll(userId: string, params: { search?: string; archived?: string; sort?: string }) {
    const { search, archived, sort } = params;

    const where: any = { userId };

    // Filter by archived status
    if (archived === 'true') {
      where.isArchived = true;
    } else if (archived === 'false') {
      where.isArchived = false;
    }
    // else: show all

    // Full-text search
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { roleTitle: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
        { skills: { hasSome: [term.toLowerCase()] } },
      ];
    }

    const orderBy: any = sort === 'company'
      ? { companyName: 'asc' }
      : sort === 'oldest'
        ? { createdAt: 'asc' }
        : { createdAt: 'desc' };

    return this.prisma.jobDescription.findMany({
      where,
      orderBy,
      include: {
        application: {
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            isArchived: true,
            column: { select: { name: true, color: true } },
          },
        },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const jd = await this.prisma.jobDescription.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            isArchived: true,
            column: { select: { name: true, color: true } },
          },
        },
      },
    });

    if (!jd) throw new NotFoundException('Job description not found');
    if (jd.userId !== userId) throw new ForbiddenException('Access denied');

    return jd;
  }

  async archive(id: string, userId: string, isArchived: boolean) {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd) throw new NotFoundException('Job description not found');
    if (jd.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.jobDescription.update({
      where: { id },
      data: { isArchived },
    });
  }

  async delete(id: string, userId: string) {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd) throw new NotFoundException('Job description not found');
    if (jd.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.jobDescription.delete({ where: { id } });
    return { success: true };
  }

  // Called internally when creating/updating an application with JD text.
  // By default does NOT run AI analysis — call reanalyze() for that.
  async createOrUpdate(
    userId: string,
    applicationId: string,
    companyName: string,
    roleTitle: string,
    content: string,
    jobUrl?: string,
    options: { analyzeWithAi?: boolean } = {},
  ) {
    const { analyzeWithAi = false } = options;

    // Check if JD record already exists for this application
    const existing = await this.prisma.jobDescription.findUnique({
      where: { applicationId },
    });

    let skills: string[] = [];
    let experience: string[] = [];
    let education: string[] = [];
    let keywords: string[] = [];
    let structured: any = null;

    if (analyzeWithAi) {
      // Full AI analysis — only when explicitly requested
      this.logger.log(`Running AI analysis for applicationId=${applicationId}`);
      const analysis = await this.aiService.extractKeywords(content);
      skills = analysis.skills;
      experience = analysis.experience;
      education = analysis.education;
      keywords = [...analysis.skills, ...analysis.experience, ...analysis.education, ...analysis.softSkills];
      structured = await this.aiService.restructureJD(content, companyName, roleTitle);
    } else {
      this.logger.log(`Saving JD without AI analysis for applicationId=${applicationId} (use reanalyze to run AI)`);
    }

    const payload = {
      companyName,
      roleTitle,
      content,
      structured,
      jobUrl,
      keywords,
      skills,
      experience,
      education,
    };

    if (existing) {
      return this.prisma.jobDescription.update({
        where: { applicationId },
        data: payload,
      });
    }

    return this.prisma.jobDescription.create({
      data: { userId, applicationId, ...payload },
    });
  }

  // Re-analyze an existing JD with AI
  async reanalyze(id: string, userId: string) {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd) throw new NotFoundException('Job description not found');
    if (jd.userId !== userId) throw new ForbiddenException('Access denied');

    if (!this.aiService.isEnabled()) {
      throw new ForbiddenException('AI service is not configured. Set OPENROUTER_API_KEY in .env');
    }

    const analysis = await this.aiService.extractKeywords(jd.content);
    const structured = await this.aiService.restructureJD(jd.content, jd.companyName, jd.roleTitle);
    const allKeywords = [...analysis.skills, ...analysis.experience, ...analysis.education, ...analysis.softSkills];

    return this.prisma.jobDescription.update({
      where: { id },
      data: {
        structured,
        keywords: allKeywords,
        skills: analysis.skills,
        experience: analysis.experience,
        education: analysis.education,
      },
    });
  }
}
