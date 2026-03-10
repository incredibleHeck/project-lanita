import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantSchoolId } from '../common/tenant/tenant.context';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { InitializePaystackDto } from './dto/initialize-paystack.dto';
import { PaystackService } from './paystack.service';
import { InvoiceStatus, PaymentTransactionStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
  ) {}

  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }

  private generateReceiptNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `RCP-${year}${month}${day}-${random}`;
  }

  async generateTermInvoices(dto: GenerateInvoicesDto) {
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const feeWhere: { academicYearId: string; classId?: string | null } = {
      academicYearId: term.academicYearId,
    };

    if (dto.classId) {
      feeWhere.classId = dto.classId;
    }

    const feeStructures = await this.prisma.feeStructure.findMany({
      where: {
        academicYearId: term.academicYearId,
        OR: dto.classId
          ? [{ classId: dto.classId }, { classId: null }]
          : [{ classId: null }],
      },
    });

    if (feeStructures.length === 0) {
      throw new BadRequestException('No fee structures found for this academic year');
    }

    const studentWhere: { currentSection?: { classId: string } } = {};
    if (dto.classId) {
      studentWhere.currentSection = { classId: dto.classId };
    }

    const students = await this.prisma.studentRecord.findMany({
      where: studentWhere,
      include: {
        currentSection: { include: { class: true } },
        user: true,
      },
    });

    if (students.length === 0) {
      throw new BadRequestException('No students found for the specified criteria');
    }

    const invoices: Prisma.StudentInvoiceCreateManyInput[] = [];
    const dueDate = new Date(dto.dueDate);

    for (const student of students) {
      const existingInvoice = await this.prisma.studentInvoice.findUnique({
        where: {
          studentId_termId: {
            studentId: student.id,
            termId: dto.termId,
          },
        },
      });

      if (existingInvoice) {
        continue;
      }

      const applicableFees = feeStructures.filter(
        (fee) => fee.classId === null || fee.classId === student.currentSection.classId,
      );

      const totalAmount = applicableFees.reduce(
        (sum, fee) => sum.add(fee.amount),
        new Prisma.Decimal(0),
      );

      invoices.push({
        invoiceNumber: this.generateInvoiceNumber(),
        studentId: student.id,
        termId: dto.termId,
        totalAmount,
        amountPaid: new Prisma.Decimal(0),
        status: InvoiceStatus.PENDING,
        dueDate,
      });
    }

    if (invoices.length === 0) {
      return { message: 'All students already have invoices for this term', created: 0 };
    }

    await this.prisma.studentInvoice.createMany({
      data: invoices,
    });

    return {
      message: `Successfully generated ${invoices.length} invoices`,
      created: invoices.length,
    };
  }

  async recordPayment(dto: RecordPaymentDto) {
    const invoice = await this.prisma.studentInvoice.findUnique({
      where: { id: dto.invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const remainingBalance = invoice.totalAmount.sub(invoice.amountPaid);
    const paymentAmount = new Prisma.Decimal(dto.amount);

    if (paymentAmount.greaterThan(remainingBalance)) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingBalance.toNumber()})`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          receiptNumber: this.generateReceiptNumber(),
          invoiceId: dto.invoiceId,
          amount: paymentAmount,
          method: dto.method,
          reference: dto.reference,
        },
      });

      const newAmountPaid = invoice.amountPaid.add(paymentAmount);
      let newStatus: InvoiceStatus;

      if (newAmountPaid.greaterThanOrEqualTo(invoice.totalAmount)) {
        newStatus = InvoiceStatus.PAID;
      } else if (newAmountPaid.greaterThan(0)) {
        newStatus = InvoiceStatus.PARTIAL;
      } else {
        newStatus = InvoiceStatus.PENDING;
      }

      const updatedInvoice = await tx.studentInvoice.update({
        where: { id: dto.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus,
        },
        include: {
          student: {
            include: {
              user: { include: { profile: true } },
            },
          },
          term: true,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    return result;
  }

  async getStudentStatement(studentId: string) {
    const student = await this.prisma.studentRecord.findUnique({
      where: { id: studentId },
      include: {
        user: { include: { profile: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const invoices = await this.prisma.studentInvoice.findMany({
      where: { studentId },
      include: {
        term: { include: { academicYear: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalBilled = invoices.reduce(
      (sum, inv) => sum.add(inv.totalAmount),
      new Prisma.Decimal(0),
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum.add(inv.amountPaid),
      new Prisma.Decimal(0),
    );

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        name: `${student.user.profile?.firstName} ${student.user.profile?.lastName}`,
      },
      summary: {
        totalBilled: totalBilled.toNumber(),
        totalPaid: totalPaid.toNumber(),
        balance: totalBilled.sub(totalPaid).toNumber(),
      },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        term: inv.term.name,
        academicYear: inv.term.academicYear.name,
        totalAmount: inv.totalAmount.toNumber(),
        amountPaid: inv.amountPaid.toNumber(),
        balance: inv.totalAmount.sub(inv.amountPaid).toNumber(),
        status: inv.status,
        dueDate: inv.dueDate,
        payments: inv.payments.map((p) => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: p.amount.toNumber(),
          method: p.method,
          reference: p.reference,
          date: p.paymentDate,
        })),
      })),
    };
  }

  async getInvoices(filters: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    search?: string;
    termId?: string;
  }) {
    const { page = 1, limit = 10, status, search, termId } = filters;
    const skip = (page - 1) * limit;

    const where: {
      status?: InvoiceStatus;
      termId?: string;
      OR?: Array<{
        invoiceNumber?: { contains: string; mode: 'insensitive' };
        student?: {
          user?: {
            profile?: {
              OR?: Array<{
                firstName?: { contains: string; mode: 'insensitive' };
                lastName?: { contains: string; mode: 'insensitive' };
              }>;
            };
          };
        };
      }>;
    } = {};

    if (status) {
      where.status = status;
    }

    if (termId) {
      where.termId = termId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        {
          student: {
            user: {
              profile: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.studentInvoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
            include: {
              user: { include: { profile: true } },
              currentSection: { include: { class: true } },
            },
          },
          term: { include: { academicYear: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studentInvoice.count({ where }),
    ]);

    return {
      data: data.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentId: inv.studentId,
        studentName: `${inv.student.user.profile?.firstName} ${inv.student.user.profile?.lastName}`,
        admissionNumber: inv.student.admissionNumber,
        class: inv.student.currentSection.class.name,
        section: inv.student.currentSection.name,
        term: inv.term.name,
        academicYear: inv.term.academicYear.name,
        totalAmount: inv.totalAmount.toNumber(),
        amountPaid: inv.amountPaid.toNumber(),
        balance: inv.totalAmount.sub(inv.amountPaid).toNumber(),
        status: inv.status,
        dueDate: inv.dueDate,
        createdAt: inv.createdAt,
      })),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats() {
    const invoices = await this.prisma.studentInvoice.findMany();

    const totalExpected = invoices.reduce(
      (sum, inv) => sum.add(inv.totalAmount),
      new Prisma.Decimal(0),
    );
    const totalCollected = invoices.reduce(
      (sum, inv) => sum.add(inv.amountPaid),
      new Prisma.Decimal(0),
    );
    const outstanding = totalExpected.sub(totalCollected);

    const statusCounts = await this.prisma.studentInvoice.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const countByStatus = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalExpected: totalExpected.toNumber(),
      totalCollected: totalCollected.toNumber(),
      outstanding: outstanding.toNumber(),
      invoiceCount: {
        total: invoices.length,
        pending: countByStatus[InvoiceStatus.PENDING] || 0,
        partial: countByStatus[InvoiceStatus.PARTIAL] || 0,
        paid: countByStatus[InvoiceStatus.PAID] || 0,
        overdue: countByStatus[InvoiceStatus.OVERDUE] || 0,
      },
    };
  }

  async getTerms() {
    return this.prisma.term.findMany({
      include: { academicYear: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async getFeeStructures(academicYearId?: string) {
    const where = academicYearId ? { academicYearId } : {};
    return this.prisma.feeStructure.findMany({
      where,
      include: { class: true, academicYear: true },
      orderBy: { name: 'asc' },
    });
  }

  async verifyParentAccess(parentUserId: string, studentRecordId: string): Promise<boolean> {
    const studentRecord = await this.prisma.studentRecord.findUnique({
      where: { id: studentRecordId },
    });

    if (!studentRecord) {
      return false;
    }

    return studentRecord.parentId === parentUserId;
  }

  async verifyStudentAccess(studentUserId: string, studentRecordId: string): Promise<boolean> {
    const studentRecord = await this.prisma.studentRecord.findUnique({
      where: { id: studentRecordId },
    });

    if (!studentRecord) {
      return false;
    }

    return studentRecord.userId === studentUserId;
  }

  async initializePaystackPayment(dto: InitializePaystackDto, parentUserId: string) {
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: { id: dto.invoiceId },
      include: {
        student: { include: { parent: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const hasAccess = await this.verifyParentAccess(parentUserId, invoice.studentId);
    if (!hasAccess) {
      throw new ForbiddenException('You can only pay for your children\'s invoices');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const remaining = invoice.totalAmount.sub(invoice.amountPaid);
    const remainingNum = remaining.toNumber();
    if (remainingNum <= 0) {
      throw new BadRequestException('No remaining balance to pay');
    }

    const parent = invoice.student.parent;
    if (!parent?.email) {
      throw new BadRequestException('Parent email is required for online payment');
    }

    const reference = randomUUID();
    const tenantId = invoice.schoolId ?? getTenantSchoolId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }

    await this.prisma.paymentTransaction.create({
      data: {
        reference,
        amount: remainingNum,
        status: 'PENDING',
        channel: 'paystack',
        invoiceId: dto.invoiceId,
        paidById: parentUserId,
        tenantId,
      },
    });

    const amountInPesewas = Math.round(remainingNum * 100);
    const result = await this.paystackService.initializeTransaction(
      amountInPesewas,
      parent.email,
      reference,
      dto.callbackUrl,
    );

    return {
      authorization_url: result.authorization_url,
      reference,
    };
  }

  async getStudentRecordByUserId(userId: string) {
    return this.prisma.studentRecord.findUnique({
      where: { userId },
    });
  }

  async processChargeSuccess(reference: string, channel: string): Promise<void> {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { invoice: true },
    });

    if (!transaction) {
      return;
    }

    if (transaction.status === PaymentTransactionStatus.SUCCESS) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: PaymentTransactionStatus.SUCCESS, channel },
      });

      const invoice = transaction.invoice;
      const newAmountPaid = invoice.amountPaid.add(transaction.amount);
      const newStatus =
        newAmountPaid.greaterThanOrEqualTo(invoice.totalAmount)
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIAL;

      await tx.studentInvoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, status: newStatus },
      });
    });
  }
}
