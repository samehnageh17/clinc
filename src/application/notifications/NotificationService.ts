import { NotFoundError } from "../../domain/errors/AppError.js";
import { prisma } from "../../infrastructure/database/prisma.js";

export class NotificationService {
  async list(
    tenantId: string,
    userId: string,
    params: { unreadOnly?: boolean; skip: number; take: number }
  ) {
    const where = {
      tenantId,
      userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async unreadCount(tenantId: string, userId: string) {
    return prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });
  }

  async markRead(tenantId: string, userId: string, id: string) {
    const row = await prisma.notification.findFirst({ where: { id, tenantId, userId } });
    if (!row) throw new NotFoundError("Notification not found");
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(tenantId: string, userId: string) {
    await prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }
}
