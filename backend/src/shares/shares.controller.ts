import { Controller, Post, Get, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SharesService } from './shares.service';

@Controller('shares')
export class SharesController {
  constructor(private sharesService: SharesService) {}

  @Post(':modelId')
  @UseGuards(JwtAuthGuard)
  async createShare(
    @Request() req,
    @Param('modelId') modelId: string,
    @Body() dto: { password?: string; expiresInDays?: number; maxViews?: number } = {},
  ) {
    return this.sharesService.createShare(req.user, modelId, dto);
  }

  @Get('model/:modelId')
  @UseGuards(JwtAuthGuard)
  async getSharesForModel(@Request() req, @Param('modelId') modelId: string) {
    return this.sharesService.getSharesForModel(req.user, modelId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteShare(@Request() req, @Param('id') shareId: string) {
    return this.sharesService.deleteShare(req.user, shareId);
  }

  @Post(':id/reset-views')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resetShareViews(@Request() req, @Param('id') shareId: string) {
    return this.sharesService.resetShareViews(req.user, shareId);
  }

  @Get('public/:token')
  async getShareByToken(@Param('token') token: string) {
    return this.sharesService.getShareByToken(token);
  }

  @Post('public/:token/unlock')
  @HttpCode(HttpStatus.OK)
  async unlockShare(
    @Param('token') token: string,
    @Body('password') password?: string,
  ) {
    return this.sharesService.unlockShare(token, password);
  }
}
