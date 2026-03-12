import { SetMetadata } from '@nestjs/common';

export type ABACRuleType =
  | 'OWN_STUDENTS'
  | 'OWN_SECTIONS'
  | 'OWN_CHILDREN'
  | 'OWN_ALLOCATION';

export interface ABACRule {
  type: ABACRuleType;
}

export const ABAC = (...rules: ABACRuleType[]) =>
  SetMetadata(
    'abac',
    rules.map((type) => ({ type })),
  );
