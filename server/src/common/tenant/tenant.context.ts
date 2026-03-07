import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextValue {
  schoolId: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextValue>();

export function getTenantSchoolId(): string | undefined {
  return tenantStorage.getStore()?.schoolId;
}
