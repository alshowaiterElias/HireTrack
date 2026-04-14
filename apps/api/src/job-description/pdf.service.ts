import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateJDPdf(jd: {
    companyName: string;
    roleTitle: string;
    jobUrl?: string | null;
    content: string;
    structured?: string | null;
    skills: string[];
    experience: string[];
    education: string[];
    keywords: string[];
    createdAt: Date;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 55, right: 55 },
        info: {
          Title: `${jd.roleTitle} at ${jd.companyName}`,
          Author: 'HireTrack',
          Subject: 'Job Description',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ─── Header ──────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 120).fill('#1a1a2e');

      doc.fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(jd.roleTitle, 55, 35, { width: pageWidth });

      doc.fontSize(14)
        .font('Helvetica')
        .fillColor('#a78bfa')
        .text(jd.companyName, 55, doc.y + 4, { width: pageWidth });

      doc.fontSize(9)
        .fillColor('#888888')
        .text(`Saved: ${new Date(jd.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 55, 95);

      if (jd.jobUrl) {
        doc.fontSize(8)
          .fillColor('#6366f1')
          .text(jd.jobUrl, 55, doc.y + 2, { width: pageWidth, link: jd.jobUrl });
      }

      doc.y = 135;

      // ─── Keywords Section ─────────────────────────────────────────
      if (jd.skills.length > 0 || jd.experience.length > 0 || jd.education.length > 0) {
        this.drawSectionHeader(doc, '🎯 Key Requirements', pageWidth);

        if (jd.skills.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
            .text('Technical Skills:', 55, doc.y + 4);
          doc.fontSize(9).font('Helvetica').fillColor('#555555')
            .text(jd.skills.join('  •  '), 55, doc.y + 2, { width: pageWidth });
          doc.moveDown(0.5);
        }

        if (jd.experience.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
            .text('Experience:', 55, doc.y + 4);
          for (const exp of jd.experience) {
            doc.fontSize(9).font('Helvetica').fillColor('#555555')
              .text(`  •  ${exp}`, 55, doc.y + 2, { width: pageWidth });
          }
          doc.moveDown(0.5);
        }

        if (jd.education.length > 0) {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333')
            .text('Education:', 55, doc.y + 4);
          for (const edu of jd.education) {
            doc.fontSize(9).font('Helvetica').fillColor('#555555')
              .text(`  •  ${edu}`, 55, doc.y + 2, { width: pageWidth });
          }
          doc.moveDown(0.5);
        }

        doc.moveDown(0.5);
      }

      // ─── Main Content ─────────────────────────────────────────────
      // Use the AI-structured version if available, otherwise use original
      const content = jd.structured || jd.content;

      // Parse markdown-like content into sections
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          doc.moveDown(0.3);
          continue;
        }

        // Check for page break
        if (doc.y > doc.page.height - 80) {
          doc.addPage();
        }

        if (trimmed.startsWith('# ')) {
          // Main heading — skip (already in header)
          continue;
        } else if (trimmed.startsWith('## ')) {
          this.drawSectionHeader(doc, trimmed.replace('## ', ''), pageWidth);
        } else if (trimmed.startsWith('### ')) {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#444444')
            .text(trimmed.replace('### ', ''), 55, doc.y + 6, { width: pageWidth });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[-*]\s+/, '');
          doc.fontSize(9.5).font('Helvetica').fillColor('#333333')
            .text(`  •  ${bulletText}`, 60, doc.y + 2, { width: pageWidth - 10 });
        } else {
          doc.fontSize(9.5).font('Helvetica').fillColor('#333333')
            .text(trimmed, 55, doc.y + 2, { width: pageWidth });
        }
      }

      // ─── Footer ───────────────────────────────────────────────────
      const footerY = doc.page.height - 40;
      doc.fontSize(7)
        .fillColor('#999999')
        .font('Helvetica')
        .text('Generated by HireTrack — Job Description Vault', 55, footerY, {
          width: pageWidth,
          align: 'center',
        });

      doc.end();
    });
  }

  private drawSectionHeader(doc: PDFKit.PDFDocument, title: string, pageWidth: number) {
    doc.moveDown(0.6);
    const y = doc.y;
    doc.rect(55, y, pageWidth, 1).fill('#e0e0e0');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text(title, 55, y + 6, { width: pageWidth });
    doc.moveDown(0.3);
  }
}
