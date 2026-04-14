import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Req, Res, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

// Configure multer for local storage
const uploadDir = join(process.cwd(), 'uploads', 'resumes');

const storage = diskStorage({
  destination: (_req, _file, cb) => {
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

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
  constructor(private readonly resumeService: ResumeService) {}

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
    const filePath = join(uploadDir, resume.fileUrl);

    if (!existsSync(filePath)) {
      throw new BadRequestException('File not found on server');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${resume.fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.sendFile(filePath);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
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

    return this.resumeService.create({
      userId: req.user.sub,
      label: label.trim(),
      fileUrl: file.filename, // just the filename, stored in uploads/resumes/
      fileName: file.originalname,
      fileSize: file.size,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateResumeDto, @Req() req: any) {
    return this.resumeService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.resumeService.delete(id, req.user.sub);
  }
}
