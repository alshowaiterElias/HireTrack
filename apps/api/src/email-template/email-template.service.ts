import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { userId },
      orderBy: { category: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(data: {
    userId: string;
    name: string;
    subject: string;
    body: string;
    category: string;
  }) {
    const template = await this.prisma.emailTemplate.create({ data });
    this.logger.log(`Created template "${data.name}" for user ${data.userId}`);
    return template;
  }

  async update(id: string, userId: string, data: {
    name?: string;
    subject?: string;
    body?: string;
    category?: string;
  }) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Template not found');

    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Template not found');

    await this.prisma.emailTemplate.delete({ where: { id } });
    this.logger.log(`Deleted template ${id}`);
    return { success: true };
  }

  // Render a template with variables
  renderTemplate(template: { subject: string; body: string }, variables: Record<string, string>) {
    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{${key}\\}`, 'g');
      subject = subject.replace(pattern, value);
      body = body.replace(pattern, value);
    }

    return { subject, body };
  }

  // Seed default templates for a new user
  async seedDefaults(userId: string) {
    const existing = await this.prisma.emailTemplate.count({ where: { userId } });
    if (existing > 0) return; // Already seeded

    const defaults = [
      {
        name: 'Initial Follow-up',
        subject: 'Following up on my application for {role}',
        body: 'Hi {contact},\n\nI hope this message finds you well. I wanted to follow up on my application for the {role} position at {company}. I am very excited about this opportunity and would love to discuss how my experience can contribute to your team.\n\nBest regards,\n{name}',
        category: 'follow_up',
      },
      {
        name: 'Thank You - Post Interview',
        subject: 'Thank you for the interview - {role}',
        body: 'Dear {contact},\n\nThank you so much for taking the time to speak with me about the {role} position at {company}. I really enjoyed learning more about the team and the exciting work you\'re doing.\n\nI\'m confident that my skills would be a great fit. Please don\'t hesitate to reach out if you need any additional information.\n\nBest regards,\n{name}',
        category: 'thank_you',
      },
      {
        name: 'Networking Introduction',
        subject: 'Interested in opportunities at {company}',
        body: 'Hi {contact},\n\nI came across your profile and I\'m very interested in the work being done at {company}. I\'d love to learn more about any open opportunities on your team.\n\nWould you be open to a quick 15-minute chat?\n\nThanks,\n{name}',
        category: 'networking',
      },
      {
        name: 'Salary Negotiation',
        subject: 'Re: Offer for {role} position',
        body: 'Dear {contact},\n\nThank you so much for the offer for the {role} position at {company}. I\'m truly excited about the opportunity.\n\nAfter careful consideration, I was hoping we might discuss the compensation package. Based on my research and experience, I believe a salary of {salary} would be more reflective of the value I can bring to the team.\n\nI\'m very much looking forward to joining {company} and would appreciate the opportunity to discuss this further.\n\nBest regards,\n{name}',
        category: 'negotiation',
      },
    ];

    await this.prisma.emailTemplate.createMany({
      data: defaults.map((t) => ({ ...t, userId })),
    });

    this.logger.log(`Seeded ${defaults.length} default templates for user ${userId}`);
  }
}
