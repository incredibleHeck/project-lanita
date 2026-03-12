import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface StudentReportContext {
  studentName: string;
  rank: number;
  totalStudents: number;
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  attendanceRate: number;
  strongestSubject: string;
  weakestSubject: string;
  subjectGrades?: Array<{ subject: string; score: number; grade: string }>;
}

const REPORT_CARD_SYSTEM_PROMPT = `You are a helpful assistant generating report card comments for a Ghanaian school. 
Comments should be:
- Encouraging and constructive
- Specific to the student's performance
- Written in formal British English
- 2-3 sentences maximum
- Appropriate for parents to read
- Avoid starting with the student's name directly`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not configured - AI features will use fallback',
      );
    }
  }

  async generateReportComment(context: StudentReportContext): Promise<string> {
    if (!this.openai) {
      return this.generateFallbackComment(context);
    }

    try {
      const prompt = this.buildCommentPrompt(context);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: REPORT_CARD_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.generateFallbackComment(context);
      }

      return content.trim();
    } catch (error) {
      this.logger.error(`Failed to generate AI comment: ${error}`);
      return this.generateFallbackComment(context);
    }
  }

  async generateBatchComments(
    contexts: Array<StudentReportContext & { studentId: string }>,
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const context of contexts) {
      const comment = await this.generateReportComment(context);
      results.set(context.studentId, comment);
    }

    return results;
  }

  private buildCommentPrompt(context: StudentReportContext): string {
    return `Generate a personalized report card comment for:
Student: ${context.studentName}
Class Rank: ${context.rank} of ${context.totalStudents}
Average Score: ${context.average.toFixed(1)}%
Grade Trend: ${context.trend} (${this.getTrendDescription(context.trend)})
Attendance Rate: ${context.attendanceRate.toFixed(1)}%
Strongest Subject: ${context.strongestSubject}
Needs Improvement: ${context.weakestSubject}

Write a constructive, encouraging 2-3 sentence comment.`;
  }

  private getTrendDescription(trend: string): string {
    switch (trend) {
      case 'improving':
        return 'grades have improved compared to previous term';
      case 'declining':
        return 'grades have declined compared to previous term';
      default:
        return 'grades are consistent with previous performance';
    }
  }

  private generateFallbackComment(context: StudentReportContext): string {
    const rankPercentile =
      ((context.totalStudents - context.rank + 1) / context.totalStudents) *
      100;

    let performancePhrase: string;
    if (rankPercentile >= 90) {
      performancePhrase = 'has demonstrated exceptional academic performance';
    } else if (rankPercentile >= 70) {
      performancePhrase = 'has shown commendable effort in academics';
    } else if (rankPercentile >= 50) {
      performancePhrase = 'has maintained satisfactory progress';
    } else {
      performancePhrase = 'has potential for improvement';
    }

    let trendPhrase: string;
    switch (context.trend) {
      case 'improving':
        trendPhrase = 'The improvement in grades is encouraging.';
        break;
      case 'declining':
        trendPhrase =
          'With focused effort, we expect improved results next term.';
        break;
      default:
        trendPhrase = 'Consistent effort has been observed.';
    }

    let attendancePhrase = '';
    if (context.attendanceRate < 80) {
      attendancePhrase =
        ' Regular attendance would further support academic progress.';
    }

    return `${context.studentName} ${performancePhrase}, with particular strength in ${context.strongestSubject}. ${trendPhrase}${attendancePhrase}`;
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }
}
