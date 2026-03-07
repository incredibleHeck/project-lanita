import { SetMetadata } from '@nestjs/common';

export const Audit = (entityType: string) =>
  SetMetadata('audit', { entityType });
