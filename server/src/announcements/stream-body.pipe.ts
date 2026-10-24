import { PipeTransform, Injectable } from '@nestjs/common';

/**
 * For stream posts (body has courseId), remove title and scope so validation
 * never runs on them and the service uses its own defaults.
 */
@Injectable()
export class StreamBodyPipe implements PipeTransform<Record<string, unknown>> {
  transform(value: Record<string, unknown>): Record<string, unknown> {
    if (value && typeof value === 'object' && value.courseId) {
      const body = { ...value };
      delete body.title;
      delete body.scope;
      return body;
    }
    return value;
  }
}
