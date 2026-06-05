import { Controller, Get, Post, Param, UseGuards, Request, Headers, Ip } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats(@Request() req) {
    return this.analyticsService.getDashboardStats(req.user);
  }

  @Post('log/:shareId')
  async logView(
    @Param('shareId') shareId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Headers('cf-ipcountry') country?: string,
  ) {
    return this.analyticsService.logView(shareId, ip, userAgent, country);
  }
}
