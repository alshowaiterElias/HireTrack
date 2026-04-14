import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Req, Res, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ResumeService } from './resume.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';
import { memoryStorage } from 'multer';

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only PDF and DOCX files are allowed'), false);
  }
};

class UpdateResumeDto {
  @IsString()
  @IsOptional()
  label?: string;
}

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.resumeService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.resumeService.findOne(id, req.user.sub);
  }

  @Get(':id/performance')
  async getPerformance(@Param('id') id: string, @Req() req: any) {
    return this.resumeService.getPerformance(id, req.user.sub);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const resume = await this.resumeService.findOne(id, req.user.sub);

    if (this.storage.isUsingR2) {
      // Generate a fresh presigned URL and redirect the browser to it
      const url = await this.storage.getSignedDownloadUrl(resume.fileUrl);
      return res.redirect(url);
    }

    // Local disk fallback
    const stream = this.storage.getLocalReadStream(resume.fileUrl);
    if (!stream) {
      throw new BadRequestException('File not found on server');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${resume.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      // Use memoryStorage so we get a Buffer — works for R2 and local disk
      storage: memoryStorage(),
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('label') label: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!label || !label.trim()) {
      throw new BadRequestException('Label is required');
    }

    const result = await this.storage.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      'resumes',
    );

    return this.resumeService.create({
      userId: req.user.sub,
      label: label.trim(),
      fileUrl: result.key,   // R2 key or local filename
      fileName: file.originalname,
      fileSize: result.fileSize,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateResumeDto, @Req() req: any) {
    return this.resumeService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const resume = await this.resumeService.findOne(id, req.user.sub);
    // Clean up the file from R2/local disk
    await this.storage.delete(resume.fileUrl);
    return this.resumeService.delete(id, req.user.sub);
  }
}
