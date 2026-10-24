import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('LMS')
@ApiBearerAuth()
@Controller('lms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LmsController {
  private readonly logger = new Logger(LmsController.name);

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

  @Patch('courses/:courseId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.lmsService.updateCourse(courseId, updateCourseDto);
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

  @Delete('materials/:materialId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteMaterial(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.lmsService.deleteMaterial(materialId);
  }

  @Post('materials/:materialId/delete')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteMaterialPost(@Param('materialId', ParseUUIDPipe) materialId: string) {
    return this.lmsService.deleteMaterial(materialId);
  }

  @Delete('assignments/:assignmentId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteAssignment(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    return this.lmsService.deleteAssignment(assignmentId);
  }

  @Post('assignments/:assignmentId/delete')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteAssignmentPost(@Param('assignmentId', ParseUUIDPipe) assignmentId: string) {
    return this.lmsService.deleteAssignment(assignmentId);
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

  @Delete('lessons/:lessonId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteLesson(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.lmsService.deleteLesson(lessonId);
  }

  @Post('lessons/:lessonId/delete')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteLessonPost(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.lmsService.deleteLesson(lessonId);
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

  @Post('upload')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'text/plain',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Allowed: PDF, Word, images, text.'), false);
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.lmsService.uploadFile(file);
  }

  @Post('courses/:courseId/modules/:moduleId/materials')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createMaterial(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() createMaterialDto: CreateMaterialDto,
    @Request() req: { user: { sub: string } },
  ) {
    try {
      return await this.lmsService.createMaterial(
        courseId,
        moduleId,
        createMaterialDto,
        req.user.sub,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `createMaterial failed: ${message}`,
        stack,
      );
      throw err;
    }
  }

  @Post('modules/:moduleId/assignments')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createAssignment(
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() createAssignmentDto: CreateAssignmentDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.lmsService.createAssignment(
      moduleId,
      createAssignmentDto,
      req.user.sub,
    );
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
