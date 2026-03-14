import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LmsService } from './lms.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@ApiTags('LMS')
@ApiBearerAuth()
@Controller('lms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  @Post('courses')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.lmsService.createCourse(createCourseDto);
  }

  @Get('courses')
  findAll() {
    return this.lmsService.findAllCourses();
  }

  @Get('student/courses')
  @Roles(UserRole.STUDENT)
  getStudentCourses(@Request() req: { user: { sub: string } }) {
    return this.lmsService.getCoursesForStudent(req.user.sub);
  }

  @Get('courses/:courseId/classwork')
  @Roles(
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  getCourseClasswork(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.lmsService.getCourseClasswork(courseId);
  }

  @Get('courses/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lmsService.findOneCourse(id);
  }

  @Post('courses/:courseId/modules')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createModule(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() createModuleDto: CreateModuleDto,
  ) {
    return this.lmsService.createCourseModule(courseId, createModuleDto);
  }

  @Get('modules/:moduleId')
  @Roles(
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  getModuleWithContent(@Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.lmsService.getModuleWithContent(moduleId);
  }

  @Get('materials/:materialId')
  @Roles(
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  getMaterial(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.lmsService.getMaterialById(materialId);
  }

  @Get('lessons/:lessonId')
  @Roles(
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  getLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.lmsService.getLessonById(lessonId);
  }

  @Get('assignments/:assignmentId')
  @Roles(
    UserRole.STUDENT,
    UserRole.TEACHER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  )
  getAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Request() req: { user?: { sub: string } },
  ) {
    return this.lmsService.getAssignmentById(
      assignmentId,
      req.user?.sub,
    );
  }

  @Get('assignments/:assignmentId/submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAssignmentSubmissions(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.lmsService.getAssignmentSubmissionsForGrading(assignmentId);
  }

  @Post('modules/:moduleId/lessons')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createLesson(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.lmsService.createLesson(moduleId, createLessonDto);
  }

  @Post('courses/:courseId/modules/:moduleId/materials')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createMaterial(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() createMaterialDto: CreateMaterialDto,
  ) {
    return this.lmsService.createMaterial(
      courseId,
      moduleId,
      createMaterialDto,
    );
  }

  @Post('modules/:moduleId/assignments')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createAssignment(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() createAssignmentDto: CreateAssignmentDto,
  ) {
    return this.lmsService.createAssignment(moduleId, createAssignmentDto);
  }

  @Post('assignments/:assignmentId/submissions')
  @Roles(UserRole.STUDENT)
  submitAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() submitAssignmentDto: SubmitAssignmentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.lmsService.submitAssignment(
      assignmentId,
      req.user.sub,
      submitAssignmentDto,
    );
  }

  @Patch('submissions/:submissionId/grade')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  gradeSubmission(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() gradeSubmissionDto: GradeSubmissionDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.lmsService.gradeSubmission(
      submissionId,
      gradeSubmissionDto,
      req.user.sub,
    );
  }
}
