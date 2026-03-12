import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { RecordResultsDto } from './dto/record-results.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { ABACGuard } from '../common/guards/abac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ABAC } from '../common/decorators/abac.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
@UseGuards(AuthGuard('jwt'), RolesGuard, ABACGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  @Audit('Result')
  create(@Body() createResultDto: CreateResultDto) {
    return this.resultsService.create(createResultDto);
  }

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  recordBatch(@Body() recordResultsDto: RecordResultsDto) {
    return this.resultsService.recordBatch(recordResultsDto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ABAC('OWN_STUDENTS', 'OWN_CHILDREN')
  findAll(
    @Query('studentId') studentId?: string,
    @Query('examId') examId?: string,
  ) {
    return this.resultsService.findAll({ studentId, examId });
  }

  @Get('student/:studentId')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  getStudentResults(
    @Param('studentId') studentId: string,
    @Query('useUserId') useUserId?: string,
  ) {
    return this.resultsService.getStudentResults(
      studentId,
      useUserId === 'true',
    );
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  findOne(@Param('id') id: string) {
    return this.resultsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  @Audit('Result')
  update(@Param('id') id: string, @Body() body: Partial<CreateResultDto>) {
    return this.resultsService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Audit('Result')
  remove(@Param('id') id: string) {
    return this.resultsService.remove(id);
  }
}
