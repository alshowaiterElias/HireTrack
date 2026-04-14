import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { ReminderModule } from '../reminder/reminder.module';
import { JobDescriptionModule } from '../job-description/job-description.module';

@Module({
  imports: [ReminderModule, JobDescriptionModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
