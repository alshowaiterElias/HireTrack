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
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsArray, IsString, IsOptional } from 'class-validator';

class MarkReadDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async findAll(@Req() req: any, @Query('limit') limit?: string) {
    return this.notificationService.findAllForUser(
      req.user.sub,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return this.notificationService.getUnreadCount(req.user.sub);
  }

  @Patch('read')
  async markAsRead(@Body() dto: MarkReadDto, @Req() req: any) {
    return this.notificationService.markAsRead(dto.ids, req.user.sub);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.delete(id, req.user.sub);
  }
}
