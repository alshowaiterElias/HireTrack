import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

// ─── Formal B&W Palette ──────────────────────────────────────────
const BLACK       = '#111111';   // headings & key values
const DARK_GREY   = '#333333';   // body text
const MID_GREY    = '#666666';   // secondary labels
const LIGHT_GREY  = '#999999';   // muted notes
const RULE        = '#cccccc';   // dividers & borders
const ROW_ALT     = '#f7f7f7';   // alternating table row shade
const HEADER_BG   = '#eeeeee';   // table / section header bg
const ACCENT_LINE = '#1a1a2e';   // thin left accent on section headings only
const BAR_FILL    = '#555555';   // chart bar fill
const SUCCESS_CLR = '#1a5c36';   // response rate ≥ 30 % (dark green — semantic)
const WARNING_CLR = '#7a5200';   // response rate ≥ 15 % (dark amber)
const DANGER_CLR  = '#7a1a1a';   // response rate  < 15 % (dark red)

@Injectable()
export class AnalyticsPdfService {
  private readonly logger = new Logger(AnalyticsPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async generateReport(userId: string): Promise<Buffer> {
    this.logger.log(`Generating PDF analytics report for user ${userId}`);

    const [overview, momentum, funnel, activity, sources, resumes, timeInStage, salary] =
      await Promise.all([
        this.analyticsService.getOverview(userId),
        this.analyticsService.getMomentumScore(userId),
        this.analyticsService.getFunnel(userId),
        this.analyticsService.getWeeklyActivity(userId, 12),
        this.analyticsService.getSourcePerformance(userId),
        this.analyticsService.getResumePerformance(userId),
        this.analyticsService.getTimeInStage(userId),
        this.analyticsService.getSalaryDistribution(userId),
      ]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    return this.buildPdf({ overview, momentum, funnel, activity, sources, resumes, timeInStage, salary, user });
  }

  private buildPdf(data: {
    overview: any;
    momentum: any;
    funnel: any[];
    activity: any[];
    sources: any[];
    resumes: any[];
    timeInStage: any[];
    salary: any[];
    user: { name: string | null; email: string } | null;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: 'HireTrack — Analytics Report',
          Author: data.user?.name || 'HireTrack User',
          Subject: 'Job Search Analytics Report',
          Creator: 'HireTrack Platform',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 100;
      const generatedAt = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });

      // ─── Cover Header ────────────────────────────────────────────
      // Thin top band for brand identity — rest of header is white
      doc.rect(0, 0, doc.page.width, 6).fill(ACCENT_LINE);

      doc.fillColor(BLACK).fontSize(24).font('Helvetica-Bold')
        .text('HireTrack', 50, 24);
      doc.fillColor(MID_GREY).fontSize(11).font('Helvetica')
        .text('Job Search Analytics Report', 50, 52);

      // Right-aligned meta
      doc.fillColor(MID_GREY).fontSize(9)
        .text(`Generated: ${generatedAt}`, 50, 30, { width: W, align: 'right' });
      if (data.user) {
        doc.fillColor(LIGHT_GREY).fontSize(9)
          .text(data.user.name || data.user.email, 50, 43, { width: W, align: 'right' });
      }

      // Full-width rule below header
      doc.rect(50, 68, W, 0.75).fill(RULE);

      doc.y = 84;

      // ─── Section 1: Overview Stats ───────────────────────────────
      this.sectionHeading(doc, '1. Overview', W);

      const stats = [
        { label: 'Total Applications', value: String(data.overview?.totalApplications ?? 0) },
        { label: 'Active Campaigns',   value: String(data.overview?.activeCampaigns ?? 0) },
        { label: 'Active Interviews',  value: String(data.overview?.activeInterviews ?? 0) },
        { label: 'Offers Received',    value: String(data.overview?.offers ?? 0) },
        { label: 'Rejected',           value: String(data.overview?.rejected ?? 0) },
        { label: 'Momentum Score',     value: String(data.momentum?.score ?? 0) + ' / 100' },
      ];

      const colW = W / 3;
      const cardH = 48;
      const startY = doc.y + 4;

      for (let i = 0; i < stats.length; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 50 + col * colW;
        const y = startY + row * (cardH + 6);

        // Card border
        doc.rect(x + 2, y, colW - 8, cardH).stroke(RULE);
        // Top accent line (very thin)
        doc.rect(x + 2, y, colW - 8, 2).fill(DARK_GREY);

        doc.fillColor(BLACK).fontSize(20).font('Helvetica-Bold')
          .text(stats[i].value, x + 10, y + 10, { width: colW - 20 });
        doc.fillColor(MID_GREY).fontSize(8).font('Helvetica')
          .text(stats[i].label, x + 10, y + 34, { width: colW - 20 });
      }

      doc.y = startY + Math.ceil(stats.length / 3) * (cardH + 6) + 12;

      // ─── Section 2: Conversion Funnel ────────────────────────────
      this.sectionHeading(doc, '2. Application Funnel', W);

      if (data.funnel.length === 0) {
        this.emptyNote(doc, 'No applications yet.', W);
      } else {
        const maxCount = Math.max(...data.funnel.map(f => f.count), 1);
        for (const stage of data.funnel) {
          this.checkPageBreak(doc);
          const barW = Math.max((stage.count / maxCount) * (W - 110), 6);
          const rowY = doc.y;

          doc.fillColor(DARK_GREY).fontSize(9).font('Helvetica')
            .text(stage.name, 50, rowY, { width: 100, continued: false });

          doc.rect(155, rowY + 1, barW, 10).fill(BAR_FILL);

          doc.fillColor(MID_GREY).fontSize(9)
            .text(String(stage.count), 155 + barW + 6, rowY);

          doc.y = rowY + 17;
        }
      }

      doc.moveDown(0.5);

      // ─── Section 3: Weekly Activity ──────────────────────────────
      this.sectionHeading(doc, '3. Weekly Activity (Last 12 Weeks)', W);

      if (data.activity.length === 0) {
        this.emptyNote(doc, 'No activity recorded yet.', W);
      } else {
        const recent = data.activity.slice(-12);
        const maxAct = Math.max(...recent.map(a => a.count), 1);
        const barSlotW = W / recent.length;
        const chartH = 50;
        const baseY = doc.y + chartH;

        for (let i = 0; i < recent.length; i++) {
          const week = recent[i];
          const bH = Math.max((week.count / maxAct) * chartH, week.count > 0 ? 4 : 0);
          const bX = 50 + i * barSlotW;
          if (bH > 0) {
            doc.rect(bX + 2, baseY - bH, barSlotW - 6, bH).fill(BAR_FILL);
          }
          if (week.count > 0) {
            doc.fillColor(DARK_GREY).fontSize(6).font('Helvetica')
              .text(String(week.count), bX, baseY - bH - 8, { width: barSlotW, align: 'center' });
          }
          doc.fillColor(LIGHT_GREY).fontSize(6)
            .text(week.week.slice(5), bX, baseY + 3, { width: barSlotW, align: 'center' });
        }
        doc.y = baseY + 20;
      }

      doc.moveDown(0.5);

      // ─── Section 4: Source Performance ───────────────────────────
      this.checkPageBreak(doc, 120);
      this.sectionHeading(doc, '4. Source Performance', W);

      if (data.sources.length === 0) {
        this.emptyNote(doc, 'No source data yet.', W);
      } else {
        const cols = [
          { x: 50,  w: 160, label: 'Source' },
          { x: 215, w: 60,  label: 'Total' },
          { x: 280, w: 60,  label: 'Responded' },
          { x: 345, w: 80,  label: 'Response %' },
          { x: 430, w: W - 380, label: 'Share' },
        ];
        const hY = doc.y;
        doc.rect(50, hY, W, 16).fill(HEADER_BG);
        for (const col of cols) {
          doc.fillColor(DARK_GREY).fontSize(8).font('Helvetica-Bold')
            .text(col.label, col.x + 4, hY + 3, { width: col.w });
        }
        doc.y = hY + 18;

        for (const src of data.sources) {
          this.checkPageBreak(doc);
          const rowY = doc.y;
          const idx = data.sources.indexOf(src);
          if (idx % 2 === 1) doc.rect(50, rowY, W, 15).fill(ROW_ALT);
          const rateColor = src.responseRate >= 30 ? SUCCESS_CLR : src.responseRate >= 15 ? WARNING_CLR : DANGER_CLR;
          const maxSrc = Math.max(...data.sources.map((s: any) => s.total), 1);

          doc.fillColor(DARK_GREY).fontSize(8).font('Helvetica')
            .text(src.source.replace(/_/g, ' '), 54, rowY + 2, { width: 156 });
          doc.text(String(src.total), 219, rowY + 2, { width: 56 });
          doc.text(String(src.responded ?? 0), 284, rowY + 2, { width: 56 });
          doc.fillColor(rateColor).text(`${src.responseRate}%`, 349, rowY + 2, { width: 76 });

          const bW = Math.max((src.total / maxSrc) * (W - 385), 3);
          doc.rect(434, rowY + 3, bW, 8).fill(BAR_FILL);

          doc.y = rowY + 16;
        }
      }

      doc.moveDown(0.5);

      // ─── Section 5: Avg. Time in Stage ───────────────────────────
      this.checkPageBreak(doc, 100);
      this.sectionHeading(doc, '5. Average Time in Stage', W);

      if (data.timeInStage.length === 0) {
        this.emptyNote(doc, 'Not enough stage transition data yet.', W);
      } else {
        const maxDays = Math.max(...data.timeInStage.map(t => t.avgDays), 1);
        for (const ts of data.timeInStage) {
          this.checkPageBreak(doc);
          const rowY = doc.y;
          const bW = Math.max((ts.avgDays / maxDays) * (W - 130), 6);
          doc.fillColor(DARK_GREY).fontSize(9).font('Helvetica')
            .text(ts.stage, 50, rowY, { width: 120 });
          doc.rect(175, rowY + 1, bW, 10).fill(BAR_FILL);
          doc.fillColor(MID_GREY).fontSize(9)
            .text(`${ts.avgDays}d`, 175 + bW + 6, rowY);
          doc.y = rowY + 17;
        }
      }

      doc.moveDown(0.5);

      // ─── Section 6: Resume Performance ───────────────────────────
      if (data.resumes.length > 0) {
        this.checkPageBreak(doc, 80);
        this.sectionHeading(doc, '6. Resume Performance', W);

        const hY = doc.y;
        doc.rect(50, hY, W, 16).fill(HEADER_BG);
        doc.fillColor(DARK_GREY).fontSize(8).font('Helvetica-Bold')
          .text('Resume Label', 54, hY + 3, { width: 200 });
        doc.text('Applications', 260, hY + 3, { width: 80 });
        doc.text('Response Rate', 345, hY + 3, { width: 100 });
        doc.y = hY + 18;

        for (const r of data.resumes) {
          this.checkPageBreak(doc);
          const rY = doc.y;
          if (data.resumes.indexOf(r) % 2 === 1) doc.rect(50, rY, W, 14).fill(ROW_ALT);
          const rateColor = r.responseRate >= 30 ? SUCCESS_CLR : r.responseRate >= 15 ? WARNING_CLR : DANGER_CLR;
          doc.fillColor(DARK_GREY).fontSize(8).font('Helvetica')
            .text(r.label, 54, rY + 2, { width: 200 });
          doc.text(String(r.totalApplications), 264, rY + 2, { width: 76 });
          doc.fillColor(rateColor).text(`${r.responseRate}%`, 349, rY + 2, { width: 96 });
          doc.y = rY + 15;
        }
        doc.moveDown(0.5);
      }

      // ─── Section 7: Salary Ranges ────────────────────────────────
      if (data.salary.length > 0) {
        this.checkPageBreak(doc, 80);
        this.sectionHeading(doc, '7. Salary Ranges', W);

        const maxSal = Math.max(...data.salary.map(s => s.max), 1);
        for (const s of data.salary.slice(0, 10)) {
          this.checkPageBreak(doc);
          const rowY = doc.y;
          const cur = s.currency === 'USD' ? '$' : s.currency;
          const label = `${s.company} — ${s.role || ''}`.slice(0, 40);
          doc.fillColor(DARK_GREY).fontSize(8).font('Helvetica')
            .text(label, 50, rowY, { width: 180 });

          const barStart = 235;
          const barAreaW = W - 185 - 60;
          const left = (s.min / maxSal) * barAreaW;
          const width = Math.max(((s.max - s.min) / maxSal) * barAreaW, 6);
          doc.rect(barStart + left, rowY + 1, width, 10).fill(BAR_FILL);
          doc.fillColor(MID_GREY).fontSize(8)
            .text(`${cur}${(s.min / 1000).toFixed(0)}k–${(s.max / 1000).toFixed(0)}k`, barStart + barAreaW + 6, rowY);
          doc.y = rowY + 16;
        }
        doc.moveDown(0.5);
      }

      // ─── Footer on every page ─────────────────────────────────────
      const range = doc.bufferedPageRange();
      const pageCount = range.count;

      for (let p = 0; p < pageCount; p++) {
        doc.switchToPage(range.start + p);
        doc.rect(0, doc.page.height - 28, doc.page.width, 28).fill(HEADER_BG);
        doc.rect(0, doc.page.height - 28, doc.page.width, 0.5).fill(RULE);
        doc.fillColor(LIGHT_GREY).fontSize(7).font('Helvetica')
          .text(
            `HireTrack Analytics Report  •  Generated ${generatedAt}  •  Page ${p + 1} of ${pageCount}`,
            50, doc.page.height - 18, { width: W, align: 'center' },
          );
      }

      doc.flushPages();
      doc.end();
    });
  }

  private sectionHeading(doc: PDFKit.PDFDocument, title: string, W: number) {
    this.checkPageBreak(doc, 40);
    const y = doc.y;
    // Light grey background + left accent line
    doc.rect(50, y, W, 20).fill(HEADER_BG);
    doc.rect(50, y, 3, 20).fill(ACCENT_LINE);
    doc.fillColor(BLACK).fontSize(10).font('Helvetica-Bold')
      .text(title, 60, y + 5, { width: W - 16 });
    doc.y = y + 28;
  }

  private emptyNote(doc: PDFKit.PDFDocument, msg: string, W: number) {
    doc.fillColor(LIGHT_GREY).fontSize(9).font('Helvetica-Oblique')
      .text(msg, 50, doc.y, { width: W });
    doc.moveDown(0.5);
  }

  private checkPageBreak(doc: PDFKit.PDFDocument, minSpace = 60) {
    if (doc.y > doc.page.height - 80 - minSpace) {
      doc.addPage();
    }
  }
}
