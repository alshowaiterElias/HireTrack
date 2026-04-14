import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import * as bcrypt from 'bcryptjs';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_CAMPAIGN_COLUMNS = [
  { name: 'Saved', color: '#6366f1', position: 0, isDefault: true },
  { name: 'Applied', color: '#3b82f6', position: 1 },
  { name: 'Phone Screen', color: '#f59e0b', position: 2 },
  { name: 'Interview', color: '#f97316', position: 3 },
  { name: 'Offer', color: '#10b981', position: 4 },
  { name: 'Rejected', color: '#ef4444', position: 5 },
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Password-based Registration ─────────────────────────────
  async register(email: string, password: string, name?: string) {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0],
        oauthProvider: 'email',
      },
    });

    // Create default campaign
    await this.prisma.campaign.create({
      data: {
        userId: user.id,
        name: 'My Job Search',
        goal: 'Land my dream role',
        weeklyGoal: 10,
        columns: { create: DEFAULT_CAMPAIGN_COLUMNS },
      },
    });

    // Seed default email templates
    await this.seedDefaultTemplates(user.id);

    this.logger.log(`Registered new user: ${email} (${user.id})`);
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      ...tokens,
    };
  }

  // ─── Password-based Login ────────────────────────────────────
  async emailLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`User logged in: ${email}`);
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      ...tokens,
    };
  }

  // ─── OAuth Login/Registration ────────────────────────────────
  async validateOAuthUser(profile: {
    email: string;
    name?: string;
    avatarUrl?: string;
    provider: string;
    providerId: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          oauthProvider: profile.provider,
          oauthId: profile.providerId,
        },
      });

      await this.prisma.campaign.create({
        data: {
          userId: user.id,
          name: 'My Job Search',
          goal: 'Land my dream role',
          weeklyGoal: 10,
          columns: { create: DEFAULT_CAMPAIGN_COLUMNS },
        },
      });

      await this.seedDefaultTemplates(user.id);
      this.logger.log(`OAuth user registered: ${profile.email} via ${profile.provider}`);
    }

    return user;
  }

  // ─── Email Verification (for signup) ──────────────────────────
  async sendVerificationCode(email: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.verificationCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    await this.prisma.verificationCode.create({
      data: { email, code, expiresAt },
    });

    // Send the verification code via email (Resend)
    await this.emailService.sendVerificationCode(email, code);

    return { success: true, message: 'Verification code sent' };
  }

  async verifyCode(email: string, code: string) {
    const record = await this.prisma.verificationCode.findFirst({
      where: { email, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { success: true, verified: true };
  }

  // ─── Forgot Password Flow ────────────────────────────────────
  async sendPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists
      return { success: true, message: 'If this email exists, a reset code has been sent' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.passwordResetCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    await this.prisma.passwordResetCode.create({
      data: { email, code, expiresAt },
    });

    // Send the password reset code via email (Resend)
    await this.emailService.sendPasswordReset(email, code);

    return { success: true, message: 'If this email exists, a reset code has been sent' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const record = await this.prisma.passwordResetCode.findFirst({
      where: { email, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    await this.prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    this.logger.log(`Password reset completed for ${email}`);
    return { success: true, message: 'Password has been reset' };
  }

  // ─── Profile Management ──────────────────────────────────────
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        timezone: true, digestEnabled: true, oauthProvider: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; timezone?: string; digestEnabled?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.digestEnabled !== undefined && { digestEnabled: data.digestEnabled }),
      },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        timezone: true, digestEnabled: true, createdAt: true,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`);
    return updated;
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // ── Clean up uploaded files from disk before DB cascade ───────────────
    const fs = await import('fs/promises');

    // 1. Resume files
    try {
      const resumes = await this.prisma.resumeVersion.findMany({
        where: { userId },
        select: { fileUrl: true },
      });
      for (const r of resumes) {
        const p = r.fileUrl.startsWith('/') ? r.fileUrl.slice(1) : r.fileUrl;
        await fs.unlink(p).catch(() => {});
      }
    } catch (err) {
      this.logger.warn(`Resume file cleanup failed for ${userId}: ${err}`);
    }

    // 2. Attachment files
    try {
      const attachments = await this.prisma.attachment.findMany({
        where: { application: { column: { campaign: { userId } } } },
        select: { fileUrl: true },
      });
      for (const a of attachments) {
        const p = a.fileUrl.startsWith('/') ? a.fileUrl.slice(1) : a.fileUrl;
        await fs.unlink(p).catch(() => {});
      }
    } catch (err) {
      this.logger.warn(`Attachment file cleanup failed for ${userId}: ${err}`);
    }

    // ── Delete user — Prisma cascades remove all DB records ───────────────
    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`Account fully deleted: ${user.email} (${userId})`);
    return { success: true };
  }


  // ─── Token Management ─────────────────────────────────────────
  async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { expiresIn: '15m' }),
      this.jwt.signAsync(payload, {
        expiresIn: '7d',
        secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'hiretrack-dev-refresh-secret',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') || 'hiretrack-dev-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('User not found');

      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────
  private async seedDefaultTemplates(userId: string) {
    const defaults = [
      {
        name: 'Initial Follow-up',
        subject: 'Following up on my application for {role}',
        body: 'Hi {contact},\n\nI hope this message finds you well. I wanted to follow up on my application for the {role} position at {company}.\n\nBest regards,\n{name}',
        category: 'follow_up',
      },
      {
        name: 'Thank You - Post Interview',
        subject: 'Thank you for the interview - {role}',
        body: 'Dear {contact},\n\nThank you for taking the time to speak with me about the {role} position at {company}. I really enjoyed learning more about the team.\n\nBest regards,\n{name}',
        category: 'thank_you',
      },
      {
        name: 'Networking Introduction',
        subject: 'Interested in opportunities at {company}',
        body: 'Hi {contact},\n\nI came across your profile and I\'m interested in the work at {company}. Would you be open to a quick 15-minute chat?\n\nThanks,\n{name}',
        category: 'networking',
      },
    ];

    await this.prisma.emailTemplate.createMany({
      data: defaults.map((t) => ({ ...t, userId })),
    });
  }
}
