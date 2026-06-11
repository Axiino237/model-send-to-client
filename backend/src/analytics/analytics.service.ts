import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async logView(
    shareId: string,
    ip: string,
    userAgent: string,
    country?: string,
  ) {
    let browser = 'Unknown';
    let device = 'Desktop';

    if (userAgent) {
      const ua = userAgent.toLowerCase();
      if (ua.includes('firefox')) browser = 'Firefox';
      else if (ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr')) browser = 'Chrome';
      else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
      else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';

      if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
        device = 'Mobile';
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        device = 'Tablet';
      }
    }

    return this.prisma.analytics.create({
      data: {
        shareId,
        ip: ip || '127.0.0.1',
        country: country || 'Unknown',
        device,
        browser,
      },
    });
  }

  async getDashboardStats(user: { id: string; role: string }) {
    const isCreator = user.role !== 'ADMIN';
    const filter = isCreator ? { userId: user.id } : {};

    const totalModels = await this.prisma.model.count({
      where: filter,
    });

    const modelFilesSum = await this.prisma.modelFile.aggregate({
      where: isCreator ? { model: { userId: user.id } } : {},
      _sum: { size: true },
    });
    const photosSum = await this.prisma.photo.aggregate({
      where: isCreator ? { model: { userId: user.id } } : {},
      _sum: { size: true },
    });
    const videosSum = await this.prisma.video.aggregate({
      where: isCreator ? { model: { userId: user.id } } : {},
      _sum: { size: true },
    });
    const attachmentsSum = await this.prisma.attachment.aggregate({
      where: isCreator ? { model: { userId: user.id } } : {},
      _sum: { size: true },
    });
    const legacyModelsSum = await this.prisma.model.aggregate({
      where: {
        ...filter,
        modelFiles: {
          none: {},
        },
      },
      _sum: {
        size: true,
      },
    });

    const storageUsed =
      (modelFilesSum._sum.size || 0) +
      (photosSum._sum.size || 0) +
      (videosSum._sum.size || 0) +
      (attachmentsSum._sum.size || 0) +
      (legacyModelsSum._sum.size || 0);

    const totalShares = await this.prisma.share.count({
      where: isCreator ? { model: { userId: user.id } } : {},
    });

    const viewsResult = await this.prisma.share.aggregate({
      where: isCreator ? { model: { userId: user.id } } : {},
      _sum: {
        views: true,
      },
    });
    const totalViews = viewsResult._sum.views || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const viewsList = await this.prisma.analytics.findMany({
      where: {
        share: isCreator ? { model: { userId: user.id } } : {},
        viewedAt: { gte: sevenDaysAgo },
      },
      select: {
        viewedAt: true,
      },
      orderBy: { viewedAt: 'asc' },
    });

    const dailyViews: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, 0);
    }

    viewsList.forEach((v) => {
      const key = v.viewedAt.toISOString().split('T')[0];
      if (dateMap.has(key)) {
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
      }
    });

    dateMap.forEach((count, date) => {
      dailyViews.push({ date, count });
    });

    const devices = await this.prisma.analytics.groupBy({
      where: isCreator ? { share: { model: { userId: user.id } } } : {},
      by: ['device'],
      _count: {
        id: true,
      },
    });

    const browsers = await this.prisma.analytics.groupBy({
      where: isCreator ? { share: { model: { userId: user.id } } } : {},
      by: ['browser'],
      _count: {
        id: true,
      },
    });

    return {
      stats: {
        totalModels,
        totalShares,
        totalViews,
        storageUsed,
      },
      dailyViews,
      devices: devices.map((d) => ({ name: d.device || 'Unknown', count: d._count.id })),
      browsers: browsers.map((b) => ({ name: b.browser || 'Unknown', count: b._count.id })),
    };
  }
}
