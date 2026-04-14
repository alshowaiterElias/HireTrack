import { PrismaClient, ApplicationSource, Priority, WorkType, ColumnType, NoteType, ReminderType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── Clean existing demo data ─────────────────────────────
  const existingUser = await prisma.user.findUnique({ where: { email: 'demo@hiretrack.app' } });
  if (existingUser) {
    console.log('🔄 Removing existing demo user data...');
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  // ─── Create Demo User ─────────────────────────────────────
  const password = await bcrypt.hash('Demo1234!', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@hiretrack.app',
      passwordHash: password,
      name: 'Demo User',
      timezone: 'America/New_York',
      digestEnabled: true,
    },
  });
  console.log(`✅ User: demo@hiretrack.app / Demo1234!`);

  // ─── Tags ─────────────────────────────────────────────────
  const tagNames = ['react', 'typescript', 'node.js', 'python', 'remote', 'hybrid', 'onsite', 'senior', 'lead', 'aws', 'docker', 'next.js', 'graphql', 'full-stack'];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    tags[name] = tag.id;
  }

  // ─── Resumes ──────────────────────────────────────────────
  const resume1 = await prisma.resumeVersion.create({
    data: { userId: user.id, label: 'Frontend Specialist v3', fileUrl: '/uploads/resume-frontend.pdf', fileName: 'resume-frontend.pdf', fileSize: 245000 },
  });
  const resume2 = await prisma.resumeVersion.create({
    data: { userId: user.id, label: 'Full Stack Engineer v2', fileUrl: '/uploads/resume-fullstack.pdf', fileName: 'resume-fullstack.pdf', fileSize: 198000 },
  });
  const resume3 = await prisma.resumeVersion.create({
    data: { userId: user.id, label: 'Senior Developer v1', fileUrl: '/uploads/resume-senior.pdf', fileName: 'resume-senior.pdf', fileSize: 212000 },
  });
  console.log('✅ 3 resume versions created');

  // ─── Email Templates ──────────────────────────────────────
  const templateData = [
    { name: 'Follow-up After Apply', subject: 'Following up on my application — {{role}}', body: 'Hi {{name}},\n\nI recently applied for the {{role}} position at {{company}} and wanted to follow up to express my continued interest.\n\nI believe my experience in {{skills}} aligns well with the role requirements.\n\nLooking forward to hearing from you.\n\nBest regards', category: 'FOLLOW_UP' },
    { name: 'Thank You After Interview', subject: 'Thank you — {{role}} interview', body: 'Hi {{name}},\n\nThank you for taking the time to meet with me about the {{role}} position.\n\nI really enjoyed learning more about the team and the exciting challenges ahead.\n\nPlease don\'t hesitate to reach out if you need any additional information.\n\nBest regards', category: 'THANK_YOU' },
    { name: 'Networking Introduction', subject: 'Quick question about {{company}}', body: 'Hi {{name}},\n\nI noticed you work at {{company}} and I\'m really interested in the {{role}} opening.\n\nWould you be open to a quick 15-minute chat about your experience there?\n\nThanks!', category: 'NETWORKING' },
  ];
  for (const t of templateData) {
    await prisma.emailTemplate.create({ data: { ...t, userId: user.id } });
  }
  console.log('✅ 3 email templates created');

  // ─── Campaign 1: Active Frontend Search ────────────────────
  const campaign1 = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: 'Q2 2026 Frontend Search',
      goal: 'Active search for senior frontend/full-stack roles at top tech companies.',
      weeklyGoal: 8,
      status: 'ACTIVE',
    },
  });

  const cols1 = [
    { name: 'Saved', color: '#6b7280', type: ColumnType.SAVED, wip: null },
    { name: 'Applied', color: '#3b82f6', type: ColumnType.APPLIED, wip: 15 },
    { name: 'Phone Screen', color: '#8b5cf6', type: ColumnType.PHONE_SCREEN, wip: 5 },
    { name: 'Interview', color: '#f59e0b', type: ColumnType.INTERVIEW, wip: 4 },
    { name: 'Offer', color: '#10b981', type: ColumnType.OFFER, wip: 3 },
    { name: 'Rejected', color: '#ef4444', type: ColumnType.REJECTED, wip: null },
  ];
  const columns1: any[] = [];
  for (let i = 0; i < cols1.length; i++) {
    const col = await prisma.column.create({
      data: {
        campaignId: campaign1.id,
        name: cols1[i].name,
        color: cols1[i].color,
        columnType: cols1[i].type,
        wipLimit: cols1[i].wip,
        position: i,
      },
    });
    columns1.push(col);
  }

  // ─── Campaign 2: Completed Backend Search ─────────────────
  const campaign2 = await prisma.campaign.create({
    data: {
      userId: user.id,
      name: '2025 Backend Search',
      goal: 'Completed search for backend/infrastructure roles.',
      weeklyGoal: 5,
      status: 'COMPLETED',
    },
  });

  const cols2 = [
    { name: 'Saved', color: '#6b7280', type: ColumnType.SAVED, wip: null },
    { name: 'Applied', color: '#3b82f6', type: ColumnType.APPLIED, wip: null },
    { name: 'Interview', color: '#f59e0b', type: ColumnType.INTERVIEW, wip: null },
    { name: 'Offer', color: '#10b981', type: ColumnType.OFFER, wip: null },
    { name: 'Rejected', color: '#ef4444', type: ColumnType.REJECTED, wip: null },
  ];
  const columns2: any[] = [];
  for (let i = 0; i < cols2.length; i++) {
    const col = await prisma.column.create({
      data: {
        campaignId: campaign2.id,
        name: cols2[i].name,
        color: cols2[i].color,
        columnType: cols2[i].type,
        wipLimit: cols2[i].wip,
        position: i,
      },
    });
    columns2.push(col);
  }

  console.log('✅ 2 campaigns with columns created');

  // ─── Applications Data ────────────────────────────────────
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const applications = [
    // Campaign 1, Column 0 (Saved)
    { col: 0, camp: 1, company: 'Stripe', role: 'Senior Frontend Engineer', source: 'LINKEDIN' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 180000, salaryMax: 220000, resume: resume1.id, tags: ['react', 'typescript', 'remote'], createdAt: daysAgo(2), jd: 'We are looking for a Senior Frontend Engineer to join our Payments team. You will build high-quality, reusable UI components using React and TypeScript.\n\nRequirements:\n- 5+ years of experience with React\n- Strong TypeScript skills\n- Experience with design systems\n- Understanding of web accessibility\n- Bachelor\'s degree in CS or equivalent\n\nBenefits:\n- Remote work\n- Equity package\n- Unlimited PTO' },
    { col: 0, camp: 1, company: 'Linear', role: 'Product Engineer', source: 'COMPANY_SITE' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 160000, salaryMax: 200000, resume: resume1.id, tags: ['react', 'typescript', 'remote'], createdAt: daysAgo(1), jd: 'Join Linear as a Product Engineer. Build the future of project management.\n\nWhat you\'ll do:\n- Design and implement features end-to-end\n- Work closely with designers and product managers\n- Optimize performance of React applications\n\nRequirements:\n- 4+ years of frontend development\n- Proficiency in React, TypeScript\n- Eye for design and detail\n- Startup experience preferred' },

    // Column 1 (Applied)
    { col: 1, camp: 1, company: 'Vercel', role: 'Full Stack Developer', source: 'LINKEDIN' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'HYBRID' as WorkType, salaryMin: 170000, salaryMax: 210000, resume: resume2.id, tags: ['next.js', 'typescript', 'hybrid'], createdAt: daysAgo(14), jd: 'Vercel is hiring a Full Stack Developer to work on our core platform.\n\nResponsibilities:\n- Build features for the Vercel dashboard\n- Improve deployment workflows\n- Work with Next.js, React, and Node.js\n\nRequirements:\n- 3+ years with Next.js or React\n- Experience with serverless architectures\n- Strong understanding of web performance\n- Excellent communication skills' },
    { col: 1, camp: 1, company: 'Notion', role: 'Software Engineer, Frontend', source: 'REFERRAL' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'HYBRID' as WorkType, salaryMin: 175000, salaryMax: 225000, resume: resume1.id, tags: ['react', 'typescript', 'hybrid'], createdAt: daysAgo(12), jd: 'Notion is building the future of productivity. Join our frontend team.\n\nWhat you\'ll work on:\n- Block editor rendering engine\n- Real-time collaboration features\n- Performance optimization\n\nQualifications:\n- 5+ years of professional experience\n- Expert-level React knowledge\n- Experience with complex state management\n- Strong CS fundamentals' },
    { col: 1, camp: 1, company: 'Figma', role: 'Frontend Developer', source: 'INDEED' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'ONSITE' as WorkType, salaryMin: 165000, salaryMax: 200000, resume: resume1.id, tags: ['react', 'onsite'], createdAt: daysAgo(10), jd: '' },
    { col: 1, camp: 1, company: 'Datadog', role: 'Sr. Software Engineer', source: 'LINKEDIN' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 190000, salaryMax: 240000, resume: resume2.id, tags: ['typescript', 'react', 'remote', 'senior'], createdAt: daysAgo(8), jd: 'Datadog is looking for a Senior Software Engineer for our APM team.\n\nResponsibilities:\n- Build real-time data visualization dashboards\n- Design scalable frontend architecture\n- Mentor junior engineers\n\nRequirements:\n- 7+ years of software engineering\n- Deep React/TypeScript expertise\n- Experience with data visualization (D3, Canvas)\n- Strong system design skills\n- Master\'s degree preferred' },

    // Column 2 (Phone Screen)
    { col: 2, camp: 1, company: 'Shopify', role: 'Staff Frontend Engineer', source: 'REFERRAL' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 200000, salaryMax: 260000, resume: resume1.id, tags: ['react', 'typescript', 'remote', 'senior', 'lead'], createdAt: daysAgo(21), jd: 'Shopify is looking for a Staff Engineer to lead frontend initiatives.\n\nYou will:\n- Define technical direction for frontend teams\n- Build and scale React applications\n- Drive performance improvements across the platform\n- Lead architecture decisions\n\nRequirements:\n- 8+ years of frontend engineering\n- Leadership experience\n- Deep expertise in React ecosystem\n- Track record of large-scale projects' },
    { col: 2, camp: 1, company: 'Airbnb', role: 'Senior Frontend Engineer', source: 'LINKEDIN' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'HYBRID' as WorkType, salaryMin: 185000, salaryMax: 230000, resume: resume1.id, tags: ['react', 'typescript', 'hybrid'], createdAt: daysAgo(18), jd: 'Join Airbnb\'s Host Platform team.\n\nWhat you\'ll do:\n- Build the next generation of host tools\n- Work with our design system\n- Optimize for mobile web performance\n\nRequirements:\n- 5+ years of React/TypeScript\n- Mobile-first development mindset\n- Experience with A/B testing at scale\n- Bachelor\'s degree in CS' },

    // Column 3 (Interview)
    { col: 3, camp: 1, company: 'Netflix', role: 'Senior UI Engineer', source: 'COMPANY_SITE' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'HYBRID' as WorkType, salaryMin: 250000, salaryMax: 350000, resume: resume1.id, tags: ['react', 'typescript', 'senior'], createdAt: daysAgo(28), interviewDate: daysAgo(-3), jd: 'Netflix UI Engineering team is looking for a talented Senior UI Engineer.\n\nTeam:\n- Studio Engineering — building tools for content creation\n\nResponsibilities:\n- Build complex, data-intensive UIs\n- Own projects end-to-end\n- Collaborate across teams\n\nRequirements:\n- 6+ years building production UIs\n- React, TypeScript, GraphQL expertise\n- Strong product sense\n- Self-directed, high-ownership culture fit' },
    { col: 3, camp: 1, company: 'Google', role: 'Software Engineer, Frontend', source: 'COMPANY_SITE' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'ONSITE' as WorkType, salaryMin: 200000, salaryMax: 320000, resume: resume2.id, tags: ['typescript', 'onsite', 'senior'], createdAt: daysAgo(25), interviewDate: daysAgo(-5), jd: 'Google Cloud is hiring Frontend Engineers for our console team.\n\nMinimum qualifications:\n- Bachelor\'s degree in CS or equivalent\n- 5 years of software development experience\n- Experience with JavaScript/TypeScript\n\nPreferred qualifications:\n- Experience with Angular or React\n- Knowledge of cloud platforms\n- Web performance optimization experience\n- Published technical blogs or open source contributions' },

    // Column 4 (Offer)
    { col: 4, camp: 1, company: 'Meta', role: 'Senior Frontend Engineer', source: 'REFERRAL' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'HYBRID' as WorkType, salaryMin: 230000, salaryMax: 310000, resume: resume1.id, tags: ['react', 'typescript', 'hybrid', 'senior'], createdAt: daysAgo(35), offerDeadline: daysAgo(-7), jd: 'Meta is looking for Senior Frontend Engineers to join our Instagram team.\n\nWhat you\'ll build:\n- Reels creator tools\n- Content recommendation interfaces\n- Real-time collaboration features\n\nRequirements:\n- 6+ years of frontend engineering\n- React expertise (we built it!)\n- Experience at scale (billions of users)\n- Strong problem-solving skills' },

    // Column 5 (Rejected)
    { col: 5, camp: 1, company: 'Apple', role: 'Frontend Developer', source: 'COMPANY_SITE' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'ONSITE' as WorkType, salaryMin: 195000, salaryMax: 260000, resume: resume2.id, tags: ['onsite', 'senior'], createdAt: daysAgo(40), jd: '' },
    { col: 5, camp: 1, company: 'Slack', role: 'Software Engineer II', source: 'LINKEDIN' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 155000, salaryMax: 190000, resume: resume1.id, tags: ['react', 'remote'], createdAt: daysAgo(38), jd: '' },

    // Campaign 2 (Completed Backend)
    { col: 1, camp: 2, company: 'AWS', role: 'Backend Engineer', source: 'LINKEDIN' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'HYBRID' as WorkType, salaryMin: 180000, salaryMax: 230000, resume: resume3.id, tags: ['aws', 'python', 'hybrid'], createdAt: daysAgo(90), jd: '' },
    { col: 2, camp: 2, company: 'Cloudflare', role: 'Systems Engineer', source: 'COMPANY_SITE' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 170000, salaryMax: 220000, resume: resume3.id, tags: ['docker', 'remote', 'node.js'], createdAt: daysAgo(85), jd: '' },
    { col: 3, camp: 2, company: 'MongoDB', role: 'Sr. Backend Developer', source: 'REFERRAL' as ApplicationSource, priority: 'HIGH' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 190000, salaryMax: 240000, resume: resume3.id, tags: ['node.js', 'remote', 'senior'], createdAt: daysAgo(80), jd: '' },
    { col: 4, camp: 2, company: 'PlanetScale', role: 'Database Engineer', source: 'COMPANY_SITE' as ApplicationSource, priority: 'MEDIUM' as Priority, workType: 'REMOTE' as WorkType, salaryMin: 175000, salaryMax: 210000, resume: resume3.id, tags: ['remote', 'senior'], createdAt: daysAgo(75), jd: '' },
  ];

  const createdApps: any[] = [];
  for (let i = 0; i < applications.length; i++) {
    const a = applications[i];
    const cols = a.camp === 1 ? columns1 : columns2;
    const app = await prisma.application.create({
      data: {
        columnId: cols[a.col].id,
        companyName: a.company,
        roleTitle: a.role,
        source: a.source,
        priority: a.priority,
        workType: a.workType,
        salaryMin: a.salaryMin,
        salaryMax: a.salaryMax,
        currency: 'USD',
        resumeVersionId: a.resume,
        position: i,
        jobDescription: a.jd || undefined,
        jobUrl: a.jd ? `https://careers.${a.company.toLowerCase().replace(/\s/g, '')}.com/jobs/${Math.random().toString(36).slice(2, 8)}` : undefined,
        interviewDate: a.interviewDate || undefined,
        offerDeadline: a.offerDeadline || undefined,
        createdAt: a.createdAt,
        tags: {
          create: (a.tags || []).filter(t => tags[t]).map(t => ({ tagId: tags[t] })),
        },
      },
    });
    createdApps.push(app);

    // Create JD record for apps with JDs
    if (a.jd) {
      await prisma.jobDescription.create({
        data: {
          userId: user.id,
          applicationId: app.id,
          companyName: a.company,
          roleTitle: a.role,
          content: a.jd,
          jobUrl: `https://careers.${a.company.toLowerCase().replace(/\s/g, '')}.com/jobs/${Math.random().toString(36).slice(2, 8)}`,
          skills: [],
          experience: [],
          education: [],
          keywords: [],
          createdAt: a.createdAt,
        },
      });
    }
  }
  console.log(`✅ ${createdApps.length} applications created`);

  // ─── Status Changes (realistic timeline) ───────────────────
  const statusChanges: { appIdx: number; from: string; to: string; daysAgoVal: number }[] = [
    // Vercel: Saved -> Applied
    { appIdx: 2, from: 'Saved', to: 'Applied', daysAgoVal: 13 },
    // Notion: Saved -> Applied
    { appIdx: 3, from: 'Saved', to: 'Applied', daysAgoVal: 11 },
    // Shopify: Saved -> Applied -> Phone Screen
    { appIdx: 6, from: 'Saved', to: 'Applied', daysAgoVal: 20 },
    { appIdx: 6, from: 'Applied', to: 'Phone Screen', daysAgoVal: 14 },
    // Airbnb: Saved -> Applied -> Phone Screen
    { appIdx: 7, from: 'Saved', to: 'Applied', daysAgoVal: 17 },
    { appIdx: 7, from: 'Applied', to: 'Phone Screen', daysAgoVal: 12 },
    // Netflix: Saved -> Applied -> Phone Screen -> Interview
    { appIdx: 8, from: 'Saved', to: 'Applied', daysAgoVal: 26 },
    { appIdx: 8, from: 'Applied', to: 'Phone Screen', daysAgoVal: 20 },
    { appIdx: 8, from: 'Phone Screen', to: 'Interview', daysAgoVal: 14 },
    // Google: Saved -> Applied -> Phone Screen -> Interview
    { appIdx: 9, from: 'Saved', to: 'Applied', daysAgoVal: 23 },
    { appIdx: 9, from: 'Applied', to: 'Phone Screen', daysAgoVal: 18 },
    { appIdx: 9, from: 'Phone Screen', to: 'Interview', daysAgoVal: 10 },
    // Meta: Full pipeline to Offer
    { appIdx: 10, from: 'Saved', to: 'Applied', daysAgoVal: 33 },
    { appIdx: 10, from: 'Applied', to: 'Phone Screen', daysAgoVal: 28 },
    { appIdx: 10, from: 'Phone Screen', to: 'Interview', daysAgoVal: 21 },
    { appIdx: 10, from: 'Interview', to: 'Offer', daysAgoVal: 10 },
    // Apple: Saved -> Applied -> Phone Screen -> Rejected
    { appIdx: 11, from: 'Saved', to: 'Applied', daysAgoVal: 38 },
    { appIdx: 11, from: 'Applied', to: 'Phone Screen', daysAgoVal: 32 },
    { appIdx: 11, from: 'Phone Screen', to: 'Rejected', daysAgoVal: 28 },
    // Slack: Saved -> Applied -> Rejected
    { appIdx: 12, from: 'Saved', to: 'Applied', daysAgoVal: 36 },
    { appIdx: 12, from: 'Applied', to: 'Rejected', daysAgoVal: 30 },
  ];

  for (const sc of statusChanges) {
    await prisma.statusChange.create({
      data: {
        applicationId: createdApps[sc.appIdx].id,
        fromColumn: sc.from,
        toColumn: sc.to,
        changedAt: daysAgo(sc.daysAgoVal),
      },
    });
  }
  console.log(`✅ ${statusChanges.length} status changes created`);

  // ─── Notes ────────────────────────────────────────────────
  const notes = [
    { appIdx: 6, content: 'Recruiter was very friendly. Mentioned they\'re expanding the team significantly.', type: NoteType.GENERAL },
    { appIdx: 6, content: 'Prepare: React performance patterns, custom hooks deep dive, state management approaches.', type: NoteType.INTERVIEW_PREP },
    { appIdx: 8, content: 'Round 1 with hiring manager went great. Discussed Netflix culture and freedom & responsibility.', type: NoteType.FEEDBACK },
    { appIdx: 8, content: 'System design prep needed: design a streaming video player architecture.', type: NoteType.INTERVIEW_PREP },
    { appIdx: 9, content: 'Google recruiter confirmed L5 level. Need to prep algorithm questions and system design.', type: NoteType.GENERAL },
    { appIdx: 10, content: 'Offer details: $280k base + equity + signing bonus. Deadline in 2 weeks.', type: NoteType.FEEDBACK },
  ];

  for (const n of notes) {
    await prisma.note.create({
      data: { applicationId: createdApps[n.appIdx].id, content: n.content, type: n.type },
    });
  }
  console.log(`✅ ${notes.length} notes created`);

  // ─── Contacts ─────────────────────────────────────────────
  const contacts = [
    { appIdx: 6, name: 'Sarah Chen', role: 'Technical Recruiter', email: 'sarah.chen@shopify.com', phone: '+1-415-555-0101' },
    { appIdx: 6, name: 'Marcus Johnson', role: 'Engineering Manager', email: 'marcus.j@shopify.com' },
    { appIdx: 8, name: 'Lisa Park', role: 'Recruiter', email: 'lisa.park@netflix.com' },
    { appIdx: 8, name: 'James Wilson', role: 'Hiring Manager', email: 'jwilson@netflix.com' },
    { appIdx: 9, name: 'Amy Liu', role: 'Google Recruiter', email: 'amyliu@google.com', phone: '+1-650-555-0202' },
    { appIdx: 10, name: 'David Kim', role: 'Meta Recruiter', email: 'dkim@meta.com' },
    { appIdx: 10, name: 'Rachel Torres', role: 'Engineering Director', email: 'rtorres@meta.com' },
  ];

  for (const c of contacts) {
    await prisma.contact.create({
      data: {
        applicationId: createdApps[c.appIdx].id,
        name: c.name,
        role: c.role,
        email: c.email,
        phone: c.phone || null,
      },
    });
  }
  console.log(`✅ ${contacts.length} contacts created`);

  // ─── Reminders ────────────────────────────────────────────
  const reminders = [
    { message: 'Follow up with Vercel recruiter', type: ReminderType.FOLLOW_UP, remindAt: daysAgo(-1), appIdx: 2 },
    { message: 'Prepare for Shopify phone screen', type: ReminderType.INTERVIEW_PREP, remindAt: daysAgo(-2), appIdx: 6 },
    { message: 'Netflix interview prep: system design', type: ReminderType.INTERVIEW_PREP, remindAt: daysAgo(-3), appIdx: 8 },
    { message: 'Google coding prep (Leetcode medium/hard)', type: ReminderType.INTERVIEW_PREP, remindAt: daysAgo(-5), appIdx: 9 },
    { message: 'Meta offer deadline approaching', type: ReminderType.OFFER_DEADLINE, remindAt: daysAgo(-7), appIdx: 10 },
    { message: 'Send thank you note to Airbnb', type: ReminderType.THANK_YOU, remindAt: daysAgo(1), isDismissed: true, appIdx: 7 },
    { message: 'Follow up on Notion application', type: ReminderType.FOLLOW_UP, remindAt: daysAgo(3), isDismissed: true, appIdx: 3 },
    { message: 'Weekly job search review', type: ReminderType.CUSTOM, remindAt: daysAgo(-4) },
  ];

  for (const r of reminders) {
    await prisma.reminder.create({
      data: {
        userId: user.id,
        message: r.message,
        type: r.type,
        remindAt: r.remindAt,
        isDismissed: r.isDismissed || false,
        applicationId: r.appIdx !== undefined ? createdApps[r.appIdx].id : undefined,
      },
    });
  }
  console.log(`✅ ${reminders.length} reminders created`);

  // ─── Notifications ────────────────────────────────────────
  const notifications = [
    { title: 'New phone screen scheduled', message: 'Shopify phone screen confirmed for next week.', type: 'STATUS_CHANGE' },
    { title: 'Offer received!', message: 'Congratulations! Meta has extended an offer for Senior Frontend Engineer.', type: 'OFFER' },
    { title: 'Reminder: Follow up', message: 'It\'s been 7 days since you applied to Vercel.', type: 'REMINDER' },
    { title: 'Application rejected', message: 'Unfortunately, Apple has decided not to move forward.', type: 'STATUS_CHANGE' },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: { userId: user.id, ...n },
    });
  }
  console.log(`✅ ${notifications.length} notifications created`);

  // ─── Archive some old apps ─────────────────────────────────
  // Archive the campaign 2 PlanetScale offer
  await prisma.application.update({
    where: { id: createdApps[createdApps.length - 1].id },
    data: { isArchived: true },
  });
  console.log('✅ 1 application archived');

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    demo@hiretrack.app');
  console.log('🔑 Password: Demo1234!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
