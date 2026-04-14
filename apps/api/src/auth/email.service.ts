import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromEmail = this.config.get<string>('FROM_EMAIL') || 'HireTrack <noreply@hiretrack.app>';
    this.appUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('✅ Email service initialized with Resend');
    } else {
      this.logger.warn('⚠️  RESEND_API_KEY not set — emails will be logged to console only');
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const subject = 'Your HireTrack verification code';

    if (!this.resend) {
      // Dev fallback — log to console
      this.logger.log(`[DEV EMAIL] To: ${email} | Subject: ${subject} | Code: ${code}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html: this.verificationEmailHtml(code),
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${email}:`, err);
      // Don't throw — the code is already saved in DB, user can try again
    }
  }

  async sendPasswordReset(email: string, code: string): Promise<void> {
    const subject = 'Reset your HireTrack password';

    if (!this.resend) {
      this.logger.log(`[DEV EMAIL] To: ${email} | Subject: ${subject} | Code: ${code}`);
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject,
        html: this.passwordResetEmailHtml(code),
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}:`, err);
    }
  }

  // ─── Email Templates ────────────────────────────────────────────

  private verificationEmailHtml(code: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:#0d1117;padding:32px 40px;">
          <span style="font-size:22px;font-weight:700;color:#7c3aed;">HireTrack</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Verify your email address</h2>
          <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
            Enter the code below to complete your sign-up. This code expires in <strong>10 minutes</strong>.
          </p>
          <!-- Code box -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;margin-bottom:28px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111827;font-family:'Courier New',monospace;">${code}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            If you didn't request this code, you can safely ignore this email.<br>
            Never share this code with anyone.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} HireTrack · Your job search command center
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private passwordResetEmailHtml(code: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <!-- Header -->
        <tr><td style="background:#0d1117;padding:32px 40px;">
          <span style="font-size:22px;font-weight:700;color:#7c3aed;">HireTrack</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Reset your password</h2>
          <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
            Use the code below to reset your password. This code expires in <strong>15 minutes</strong>.
          </p>
          <!-- Code box -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;text-align:center;margin-bottom:28px;">
            <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#111827;font-family:'Courier New',monospace;">${code}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            If you didn't request a password reset, your account is safe and no changes have been made.<br>
            Never share this code with anyone.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} HireTrack · Your job search command center
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
