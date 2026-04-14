import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string, limit = 50) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    this.logger.log(`Fetched ${notifications.length} notifications for user ${userId}`);
    return notifications;
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    linkTo?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        linkTo: data.linkTo,
      },
    });

    this.logger.log(`Created notification ${notification.id} (${data.type}) for user ${data.userId}`);
    return notification;
  }

  async markAsRead(ids: string[], userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: { isRead: true },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);
    return { count: result.count };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    this.logger.log(`Marked all (${result.count}) notifications as read for user ${userId}`);
    return { count: result.count };
  }

  async delete(id: string, userId: string) {
    await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    return { success: true };
  }
}
