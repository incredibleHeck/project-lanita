import { Prisma } from '@prisma/client';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

/**
 * Models scoped by `schoolId`. Profile has no schoolId (scoped via User).
 * PaymentTransaction uses `tenantId` — handled separately below.
 * Raw SQL ($queryRaw / $executeRaw) bypasses this extension; always filter
 * by schoolId/tenantId explicitly in those queries.
 */
const TENANT_MODELS = new Set([
  'User',
  'Class',
  'Section',
  'Subject',
  'StudentRecord',
  'AttendanceRecord',
  'AcademicYear',
  'Exam',
  'Result',
  'FeeStructure',
  'StudentInvoice',
  'Payment',
  'Room',
  'TimetableSlot',
  'NotificationLog',
  'MessageThread',
  'Announcement',
  'Course',
  'CourseModule',
  'Lesson',
  'Material',
  'Assignment',
  'Submission',
  'Parent',
  'StudentGuardian',
  'AuditLog',
]);

const TENANT_ID_MODELS = new Set(['PaymentTransaction']);

function tenantField(model: string): 'schoolId' | 'tenantId' | null {
  if (TENANT_ID_MODELS.has(model)) return 'tenantId';
  if (TENANT_MODELS.has(model)) return 'schoolId';
  return null;
}

function applyTenantWhere(model: string, where: any, schoolId: string) {
  const field = tenantField(model);
  if (!field) return where;
  return { ...where, [field]: schoolId };
}

function applyTenantData(model: string, data: any, schoolId: string) {
  const field = tenantField(model);
  if (!field) return data;
  if (Array.isArray(data)) {
    return data.map((d) => ({ ...d, [field]: schoolId }));
  }
  return { ...data, [field]: schoolId };
}

export const tenantExtension = Prisma.defineExtension((prisma) =>
  prisma.$extends({
    name: 'tenant',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            // findUnique where is a unique input; fall back to findFirst semantics
            // by merging tenant field when the unique key allows it.
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async create({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.data = applyTenantData(model, args.data, schoolId) as any;
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.data = applyTenantData(model, args.data, schoolId);
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
            args.create = applyTenantData(model, args.create, schoolId) as any;
            args.update = applyTenantData(model, args.update, schoolId) as any;
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
        async count({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && tenantField(model)) {
            args.where = applyTenantWhere(model, args.where, schoolId);
          }
          return query(args);
        },
      },
    },
  }),
);
