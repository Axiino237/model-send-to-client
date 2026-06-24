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
    os?: string,
    screenSize?: string,
    referrer?: string,
    city?: string,
    state?: string,
  ) {
    let browser = 'Unknown';
    let device = 'Desktop';
    let calculatedOs = os || 'Unknown';

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

      if (!os) {
        if (ua.includes('win')) calculatedOs = 'Windows';
        else if (ua.includes('mac')) calculatedOs = 'MacOS';
        else if (ua.includes('linux')) calculatedOs = 'Linux';
        else if (ua.includes('android')) calculatedOs = 'Android';
        else if (ua.includes('iphone') || ua.includes('ipad')) calculatedOs = 'iOS';
      }
    }

    return this.prisma.analytics.create({
      data: {
        shareId,
        ip: ip || '127.0.0.1',
        country: country || 'Unknown',
        city,
        state,
        device,
        browser,
        os: calculatedOs,
        screenSize,
        referrer,
        viewedAt: new Date(),
      },
    });
  }

  async updateViewMetrics(analyticsId: string, timeSpentSeconds: number, interactions: number) {
    return this.prisma.analytics.update({
      where: { id: analyticsId },
      data: {
        timeSpentSeconds: { increment: timeSpentSeconds },
        interactions: { increment: interactions },
      },
    });
  }

  async getDashboardStats(user: { id: string; role: string }, range: string = '7days', modelId?: string, recentViewsPage: number = 1, recentViewsLimit: number = 10) {
    const isCreator = user.role !== 'ADMIN';
    const filter = {
      ...(isCreator ? { userId: user.id } : {}),
      ...(modelId ? { id: modelId } : {}),
    };
    
    const shareFilter = {
      model: filter
    };

    const totalModels = await this.prisma.model.count({
      where: filter,
    });

    const modelFilesSum = await this.prisma.modelFile.aggregate({
      where: shareFilter,
      _sum: { size: true },
    });
    const photosSum = await this.prisma.photo.aggregate({
      where: shareFilter,
      _sum: { size: true },
    });
    const videosSum = await this.prisma.video.aggregate({
      where: shareFilter,
      _sum: { size: true },
    });
    const attachmentsSum = await this.prisma.attachment.aggregate({
      where: shareFilter,
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
      where: shareFilter,
    });

    const viewsResult = await this.prisma.share.aggregate({
      where: shareFilter,
      _sum: {
        views: true,
      },
    });
    const totalViews = viewsResult._sum.views || 0;

    let startDate: Date | undefined = new Date();
    startDate.setHours(0, 0, 0, 0); // start of today
    let daysToGenerate = 1;

    if (range === 'today') {
      daysToGenerate = 1;
    } else if (range === '7days') {
      startDate.setDate(startDate.getDate() - 6); // past 7 days including today
      daysToGenerate = 7;
    } else if (range === 'month') {
      startDate.setDate(startDate.getDate() - 29); // past 30 days
      daysToGenerate = 30;
    } else if (range === 'all') {
      startDate = undefined; // fetch all
    }

    const viewsList = await this.prisma.analytics.findMany({
      where: {
        share: shareFilter,
        ...(startDate ? { viewedAt: { gte: startDate } } : {}),
      },
      select: {
        viewedAt: true,
      },
      orderBy: { viewedAt: 'asc' },
    });

    const dailyViews: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();

    if (range === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      for (let i = 0; i < 24; i++) {
        const d = new Date(startOfDay);
        d.setHours(i);
        const key = `${i.toString().padStart(2, '0')}:00`;
        dateMap.set(key, 0);
      }
    } else if (range !== 'all') {
      for (let i = daysToGenerate - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dateMap.set(key, 0);
      }
    }

    viewsList.forEach((v) => {
      let key = '';
      if (range === 'today') {
        const h = new Date(v.viewedAt).getHours();
        key = `${h.toString().padStart(2, '0')}:00`;
      } else {
        key = v.viewedAt.toISOString().split('T')[0];
      }
      
      if (range === 'all' && !dateMap.has(key)) {
        dateMap.set(key, 0);
      }
      if (dateMap.has(key)) {
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
      }
    });

    dateMap.forEach((count, date) => {
      dailyViews.push({ date, count });
    });

    if (range === 'all') {
      dailyViews.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    const devices = await this.prisma.analytics.groupBy({
      where: { share: shareFilter },
      by: ['device'],
      _count: { id: true },
    });

    const browsers = await this.prisma.analytics.groupBy({
      where: { share: shareFilter },
      by: ['browser'],
      _count: { id: true },
    });

    const osStats = await this.prisma.analytics.groupBy({
      where: { share: shareFilter },
      by: ['os'],
      _count: { id: true },
    });

    const referrerStats = await this.prisma.analytics.groupBy({
      where: { share: shareFilter },
      by: ['referrer'],
      _count: { id: true },
    });

    const metricsResult = await this.prisma.analytics.aggregate({
      where: { share: shareFilter },
      _sum: {
        timeSpentSeconds: true,
        interactions: true,
      },
    });

    const totalTimeSpentSeconds = metricsResult._sum.timeSpentSeconds || 0;
    const totalInteractions = metricsResult._sum.interactions || 0;

    const recentViewsWhere = {
      share: shareFilter,
      ...(startDate ? { viewedAt: { gte: startDate } } : {}),
    };

    const recentViewsTotalCount = await this.prisma.analytics.count({
      where: recentViewsWhere,
    });

    const recentViews = await this.prisma.analytics.findMany({
      where: recentViewsWhere,
      select: {
        id: true,
        viewedAt: true,
        device: true,
        browser: true,
        os: true,
        city: true,
        state: true,
        country: true,
        timeSpentSeconds: true,
        interactions: true,
        share: {
          select: {
            shareToken: true,
            model: { select: { name: true } }
          }
        }
      },
      orderBy: { viewedAt: 'desc' },
      skip: (recentViewsPage - 1) * recentViewsLimit,
      take: recentViewsLimit,
    });

    return {
      stats: {
        totalModels,
        totalShares,
        totalViews,
        storageUsed,
        totalTimeSpentSeconds,
        totalInteractions,
      },
      dailyViews,
      devices: devices.map((d) => ({ name: d.device || 'Unknown', count: d._count?.id || 0 })),
      browsers: browsers.map((b) => ({ name: b.browser || 'Unknown', count: b._count?.id || 0 })),
      os: osStats.map((o) => ({ name: o.os || 'Unknown', count: o._count?.id || 0 })),
      referrers: referrerStats.map((r) => ({ name: r.referrer || 'Direct', count: r._count?.id || 0 })),
      recentViews,
      recentViewsTotalCount,
    };
  }
}
