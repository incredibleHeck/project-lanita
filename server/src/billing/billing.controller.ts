import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole, InvoiceStatus } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BillingService } from './billing.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { InitializePaystackDto } from './dto/initialize-paystack.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('invoices/generate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  generateInvoices(@Body() dto: GenerateInvoicesDto) {
    return this.billingService.generateTermInvoices(dto);
  }

  @Get('invoices')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('search') search?: string,
    @Query('termId') termId?: string,
  ) {
    return this.billingService.getInvoices({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      search,
      termId,
    });
  }

  @Post('payments')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.billingService.recordPayment(dto);
  }

  @Post('paystack/initialize')
  @Roles(UserRole.PARENT)
  initializePaystack(
    @Body() dto: InitializePaystackDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.billingService.initializePaystackPayment(dto, req.user.sub);
  }

  @Get('statement/:studentId')
  @Roles(UserRole.PARENT, UserRole.STUDENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStudentStatement(@Param('studentId') studentId: string, @Request() req) {
    const user = req.user;

    if (user.role === UserRole.PARENT) {
      const hasAccess = await this.billingService.verifyParentAccess(user.sub, studentId);
      if (!hasAccess) {
        throw new ForbiddenException('You can only view your children\'s financial statements');
      }
    }

    if (user.role === UserRole.STUDENT) {
      const hasAccess = await this.billingService.verifyStudentAccess(user.sub, studentId);
      if (!hasAccess) {
        throw new ForbiddenException('You can only view your own financial statement');
      }
    }

    return this.billingService.getStudentStatement(studentId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getDashboardStats() {
    return this.billingService.getDashboardStats();
  }

  @Get('terms')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getTerms() {
    return this.billingService.getTerms();
  }

  @Get('fee-structures')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getFeeStructures(@Query('academicYearId') academicYearId?: string) {
    return this.billingService.getFeeStructures(academicYearId);
  }
}
