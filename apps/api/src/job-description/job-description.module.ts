import { Module } from '@nestjs/common';
import { JobDescriptionService } from './job-description.service';
import { JobDescriptionController } from './job-description.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [JobDescriptionController],
  providers: [JobDescriptionService, PdfService],
  exports: [JobDescriptionService],
})
export class JobDescriptionModule {}
