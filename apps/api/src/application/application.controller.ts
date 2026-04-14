import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { ApplicationService } from './application.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ApplicationSource, Priority, WorkType } from '@prisma/client';

class CreateApplicationDto {
  @IsString()
  columnId!: string;

  @IsString()
  companyName!: string;

  @IsString()
  roleTitle!: string;

  @IsString()
  @IsOptional()
  jobUrl?: string;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryMax?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(ApplicationSource)
  @IsOptional()
  source?: ApplicationSource;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  resumeVersionId?: string;

  @IsString()
  @IsOptional()
  coverLetter?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDateString()
  @IsOptional()
  interviewDate?: string;

  @IsDateString()
  @IsOptional()
  offerDeadline?: string;
}

class UpdateApplicationDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  roleTitle?: string;

  @IsString()
  @IsOptional()
  jobUrl?: string;

  @IsString()
  @IsOptional()
  jobDescription?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(WorkType)
  @IsOptional()
  workType?: WorkType;

  @IsNumber()
  @IsOptional()
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  salaryMax?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(ApplicationSource)
  @IsOptional()
  source?: ApplicationSource;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  resumeVersionId?: string;

  @IsString()
  @IsOptional()
  coverLetter?: string;

  @IsDateString()
  @IsOptional()
  appliedDate?: string;

  @IsDateString()
  @IsOptional()
  interviewDate?: string;

  @IsDateString()
  @IsOptional()
  offerDeadline?: string;
}

class MoveApplicationDto {
  @IsString()
  columnId!: string;

  @IsNumber()
  @Min(0)
  position!: number;

  @IsDateString()
  @IsOptional()
  interviewDate?: string;

  @IsDateString()
  @IsOptional()
  offerDeadline?: string;
}

class AddNoteDto {
  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  type?: string;
}

class AddContactDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  linkedinUrl?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

const UPLOAD_DIR_UNUSED = ''; // kept for reference only — storage handled by StorageService

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly storage: StorageService,
  ) {}

  @Get('archived')
  findArchived(@Req() req: any) {
    return this.applicationService.findArchived(req.user.sub);
  }

  @Get('export/csv')
  async exportCsv(@Req() req: any, @Res() res: Response) {
    const apps = await this.applicationService.findAll(req.user.sub);

    const escape = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const headers = [
      'Company', 'Role', 'Location', 'Status', 'Priority', 'Source',
      'Work Type', 'Salary Min', 'Salary Max', 'Currency',
      'Job URL', 'Applied Date', 'Interview Date', 'Offer Deadline',
      'Campaign', 'Column', 'Tags',
    ];

    const rows = apps.map((a: any) => [
      escape(a.companyName),
      escape(a.roleTitle),
      escape(a.location),
      escape(a.column?.name),
      escape(a.priority),
      escape(a.source),
      escape(a.workType),
      escape(a.salaryMin),
      escape(a.salaryMax),
      escape(a.currency),
      escape(a.jobUrl),
      escape(a.appliedDate ? new Date(a.appliedDate).toLocaleDateString() : ''),
      escape(a.interviewDate ? new Date(a.interviewDate).toLocaleDateString() : ''),
      escape(a.offerDeadline ? new Date(a.offerDeadline).toLocaleDateString() : ''),
      escape(a.column?.campaign?.name),
      escape(a.column?.name),
      escape((a.tags || []).join('; ')),
    ].join(','));

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hiretrack-applications-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }

  @Get()
  findAll(@Req() req: any, @Query('jobUrl') jobUrl?: string) {
    return this.applicationService.findAll(req.user.sub, jobUrl);
  }

  @Post()
  create(@Body() dto: CreateApplicationDto, @Req() req: any) {
    return this.applicationService.create(req.user.sub, {
      ...dto,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
      offerDeadline: dto.offerDeadline ? new Date(dto.offerDeadline) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.applicationService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @Req() req: any,
  ) {
    return this.applicationService.update(id, req.user.sub, {
      ...dto,
      appliedDate: dto.appliedDate ? new Date(dto.appliedDate) : undefined,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
      offerDeadline: dto.offerDeadline ? new Date(dto.offerDeadline) : undefined,
    });
  }

  @Patch(':id/move')
  move(
    @Param('id') id: string,
    @Body() dto: MoveApplicationDto,
    @Req() req: any,
  ) {
    return this.applicationService.move(id, req.user.sub, {
      columnId: dto.columnId,
      position: dto.position,
      interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined,
      offerDeadline: dto.offerDeadline ? new Date(dto.offerDeadline) : undefined,
    });
  }

  @Patch(':id/archive')
  archive(
    @Param('id') id: string,
    @Body() body: { isArchived: boolean },
    @Req() req: any,
  ) {
    return this.applicationService.archive(id, req.user.sub, body.isArchived);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.applicationService.remove(id, req.user.sub);
  }

  // Notes
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @Req() req: any,
  ) {
    return this.applicationService.addNote(id, req.user.sub, dto);
  }

  @Delete(':id/notes/:noteId')
  removeNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Req() req: any,
  ) {
    return this.applicationService.removeNote(id, noteId, req.user.sub);
  }

  @Patch(':id/notes/:noteId')
  updateNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() body: { content?: string; type?: string },
    @Req() req: any,
  ) {
    return this.applicationService.updateNote(id, noteId, req.user.sub, body);
  }

  // Contacts
  @Post(':id/contacts')
  addContact(
    @Param('id') id: string,
    @Body() dto: AddContactDto,
    @Req() req: any,
  ) {
    return this.applicationService.addContact(id, req.user.sub, dto);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Req() req: any,
  ) {
    return this.applicationService.removeContact(id, contactId, req.user.sub);
  }

  @Patch(':id/contacts/:contactId')
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() body: { name?: string; role?: string; email?: string; linkedinUrl?: string; phone?: string; notes?: string },
    @Req() req: any,
  ) {
    return this.applicationService.updateContact(id, contactId, req.user.sub, body);
  }

  // Tags
  @Post(':id/tags')
  addTag(
    @Param('id') id: string,
    @Body() body: { name: string },
    @Req() req: any,
  ) {
    return this.applicationService.addTag(id, req.user.sub, body.name);
  }

  @Delete(':id/tags/:tagId')
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Req() req: any,
  ) {
    return this.applicationService.removeTag(id, tagId, req.user.sub);
  }

  // Attachments
  @Post(':id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),         // buffer → passes to StorageService
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const result = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      'attachments',
    );

    return this.applicationService.addAttachment(id, req.user.sub, {
      fileName: file.originalname,
      fileUrl: result.key,    // R2 key or local filename
      fileSize: result.fileSize,
      fileType: file.mimetype,
    });
  }

  @Get(':id/attachments/:attachId/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachId') attachId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const app = await this.applicationService.findOne(id, req.user.sub);
    const attachment = app.attachments?.find((a: any) => a.id === attachId);
    if (!attachment) throw new Error('Attachment not found');

    if (this.storage.isUsingR2) {
      // Redirect browser to a fresh 7-day presigned R2 URL
      const url = await this.storage.getSignedDownloadUrl(attachment.fileUrl);
      return res.redirect(url);
    }

    // Local disk fallback
    const stream = this.storage.getLocalReadStream(attachment.fileUrl);
    if (!stream) throw new Error('File not found on disk');

    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    res.setHeader('Content-Type', attachment.fileType);
    stream.pipe(res);
  }

  @Delete(':id/attachments/:attachId')
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachId') attachId: string,
    @Req() req: any,
  ) {
    const result = await this.applicationService.removeAttachment(id, attachId, req.user.sub);
    await this.storage.delete(result.fileUrl);
    return { success: true };
  }
}
