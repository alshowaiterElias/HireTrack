import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ReminderType } from '@prisma/client';

class CreateReminderDto {
  @IsString()
  message!: string;

  @IsEnum(ReminderType)
  type!: ReminderType;

  @IsDateString()
  remindAt!: string;

  @IsString()
  @IsOptional()
  applicationId?: string;
}

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.reminderService.findAllForUser(req.user.sub);
  }

  @Get('upcoming')
  async findUpcoming(@Req() req: any) {
    return this.reminderService.findUpcoming(req.user.sub);
  }

  @Post()
  async create(@Body() dto: CreateReminderDto, @Req() req: any) {
    return this.reminderService.create({
      userId: req.user.sub,
      applicationId: dto.applicationId,
      message: dto.message,
      type: dto.type,
      remindAt: new Date(dto.remindAt),
    });
  }

  @Patch(':id/dismiss')
  async dismiss(@Param('id') id: string, @Req() req: any) {
    return this.reminderService.dismiss(id, req.user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.reminderService.delete(id, req.user.sub);
  }
}
