import { Prisma } from '@prisma/client';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

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
]);

function hasSchoolId(model: string): boolean {
  return TENANT_MODELS.has(model);
}

export const tenantExtension = Prisma.defineExtension((prisma) =>
  prisma.$extends({
    name: 'tenant',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async create({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.data = { ...args.data, schoolId } as any;
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.data = Array.isArray(args.data)
              ? args.data.map((d: any) => ({ ...d, schoolId }))
              : { ...args.data, schoolId };
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async delete({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          const schoolId = getTenantSchoolId();
          if (schoolId && hasSchoolId(model)) {
            args.where = { ...args.where, schoolId };
            args.create = { ...args.create, schoolId } as any;
            args.update = { ...args.update, schoolId } as any;
          }
          return query(args);
        },
      },
    },
  }),
);
