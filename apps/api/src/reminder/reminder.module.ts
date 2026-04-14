import { Module } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { ReminderController } from './reminder.controller';

@Module({
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
