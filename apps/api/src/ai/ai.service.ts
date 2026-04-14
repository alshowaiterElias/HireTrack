import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface JDAnalysis {
  skills: string[];
  experience: string[];
  education: string[];
  certifications: string[];
  softSkills: string[];
  requirements: string[];
}

export interface JDStructured {
  overview: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  details: Record<string, string>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    // Support both OpenRouter and OpenAI via the same OpenAI SDK
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENROUTER_BASE_URL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';
    this.model = process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-4.1-nano';

    if (apiKey && apiKey !== 'sk-REPLACE-WITH-YOUR-KEY') {
      this.client = new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders: {
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'HireTrack',
        },
      });
      this.logger.log(`AI service initialized — provider: ${baseURL}, model: ${this.model}`);
    } else {
      this.logger.warn('AI API key not configured — AI features disabled. Set OPENROUTER_API_KEY in .env');
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async extractKeywords(jdText: string): Promise<JDAnalysis> {
    if (!this.client) {
      return this.fallbackExtraction(jdText);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a job description analyzer. Extract key requirements and return valid JSON with these exact fields:
{
  "skills": ["technical skills mentioned"],
  "experience": ["experience requirements like '5+ years React'"],
  "education": ["education requirements"],
  "certifications": ["certifications if any"],
  "softSkills": ["soft skills mentioned"],
  "requirements": ["other requirements like work authorization, clearance, etc"]
}
Keep each item concise (under 6 words). Return empty arrays for missing sections.`,
          },
          {
            role: 'user',
            content: `Extract requirements from this job description:\n\n${jdText.slice(0, 4000)}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      this.logger.log('AI keyword extraction successful');
      return {
        skills: parsed.skills || [],
        experience: parsed.experience || [],
        education: parsed.education || [],
        certifications: parsed.certifications || [],
        softSkills: parsed.softSkills || [],
        requirements: parsed.requirements || [],
      };
    } catch (err) {
      this.logger.error('AI extraction failed, using fallback', err);
      return this.fallbackExtraction(jdText);
    }
  }

  async restructureJD(jdText: string, companyName: string, roleTitle: string): Promise<string> {
    if (!this.client) {
      return jdText; // Return original if AI not available
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a job description formatter. Restructure the given job description into a clean, well-organized markdown format. Use this structure:

# {Role Title} at {Company}

## Overview
Brief summary of the role (2-3 sentences).

## Key Responsibilities
- Bullet points of main duties

## Required Qualifications
- Bullet points of must-have requirements

## Preferred Qualifications
- Bullet points of nice-to-have requirements

## Technical Skills
- Tech stack and tools mentioned

## Benefits & Perks
- Any benefits mentioned (or omit if none)

## Additional Details
- Location, work type, salary, etc.

Keep all original information but organize it clearly. Use markdown formatting.`,
          },
          {
            role: 'user',
            content: `Company: ${companyName}\nRole: ${roleTitle}\n\nJob Description:\n${jdText.slice(0, 4000)}`,
          },
        ],
      });

      const structured = completion.choices[0]?.message?.content || jdText;
      this.logger.log('AI JD restructure successful');
      return structured;
    } catch (err) {
      this.logger.error('AI restructure failed', err);
      return jdText;
    }
  }

  // Fallback regex-based extraction when AI is unavailable
  private fallbackExtraction(text: string): JDAnalysis {
    const lower = text.toLowerCase();
    const skills: string[] = [];
    const experience: string[] = [];
    const education: string[] = [];

    // Common tech skills
    const techSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'Spring',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
      'GraphQL', 'REST', 'gRPC', 'Microservices', 'Machine Learning', 'AI',
      'Git', 'Linux', 'Agile', 'Scrum', 'TDD', 'Figma', 'Tailwind',
    ];

    for (const skill of techSkills) {
      if (lower.includes(skill.toLowerCase())) skills.push(skill);
    }

    // Experience patterns
    const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/gi);
    if (expMatch) experience.push(...expMatch.map(m => m.trim()));

    // Education patterns
    if (lower.includes("bachelor")) education.push("Bachelor's degree");
    if (lower.includes("master")) education.push("Master's degree");
    if (lower.includes("phd") || lower.includes("doctorate")) education.push("PhD");

    return {
      skills,
      experience,
      education,
      certifications: [],
      softSkills: [],
      requirements: [],
    };
  }
}
