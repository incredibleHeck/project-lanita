import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import type { Request } from 'express';
import type { School } from '@prisma/client';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {}

  get schoolId(): string | undefined {
    return this.request['schoolId'];
  }

  get school(): School | undefined {
    return this.request['school'];
  }
}
