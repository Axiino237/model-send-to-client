import { Controller, Get, Post, Put, Param, UseGuards, Request, Headers, Ip, Query, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(
    @Request() req, 
    @Query('range') range?: string, 
    @Query('modelId') modelId?: string,
    @Query('recentViewsPage') recentViewsPage?: string,
    @Query('recentViewsLimit') recentViewsLimit?: string
  ) {
    const pageNum = recentViewsPage ? parseInt(recentViewsPage, 10) : 1;
    const limitNum = recentViewsLimit ? parseInt(recentViewsLimit, 10) : 10;
    return this.analyticsService.getDashboardStats(req.user, range, modelId, pageNum, limitNum);
  }

  @Post('log/:shareId')
  async logView(
    @Param('shareId') shareId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('cf-ipcountry') country?: string,
    @Body() body?: { os?: string; screenSize?: string; referrer?: string; country?: string; city?: string; state?: string }
  ) {
    return this.analyticsService.logView(
      shareId, 
      ip, 
      userAgent, 
      body?.country || country, 
      body?.os, 
      body?.screenSize, 
      body?.referrer, 
      body?.city, 
      body?.state
    );
  }

  @Put('log/:analyticsId')
  async updateViewMetrics(
    @Param('analyticsId') analyticsId: string,
    @Body() body: { timeSpentSeconds: number; interactions: number }
  ) {
    return this.analyticsService.updateViewMetrics(analyticsId, body.timeSpentSeconds || 0, body.interactions || 0);
  }
}
