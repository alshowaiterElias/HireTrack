import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
  Post,
} from '@nestjs/common';
import { Response } from 'express';
import { JobDescriptionService } from './job-description.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfService } from './pdf.service';

@Controller('job-descriptions')
@UseGuards(JwtAuthGuard)
export class JobDescriptionController {
  constructor(
    private readonly jdService: JobDescriptionService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('archived') archived?: string,
    @Query('sort') sort?: string,
  ) {
    return this.jdService.findAll(req.user.sub, { search, archived, sort });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.jdService.findOne(id, req.user.sub);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Req() req: any, @Query('value') value?: string) {
    const isArchived = value !== 'false';
    return this.jdService.archive(id, req.user.sub, isArchived);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.jdService.delete(id, req.user.sub);
  }

  @Post(':id/reanalyze')
  reanalyze(@Param('id') id: string, @Req() req: any) {
    return this.jdService.reanalyze(id, req.user.sub);
  }

  @Get(':id/export/pdf')
  async exportPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const jd = await this.jdService.findOne(id, req.user.sub);

    const pdfBuffer = await this.pdfService.generateJDPdf(jd);

    const filename = `${jd.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${jd.roleTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
