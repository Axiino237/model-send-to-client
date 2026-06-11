import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModelsService } from '../models/models.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class SharesService {
  constructor(
    private prisma: PrismaService,
    private modelsService: ModelsService,
  ) {}

  async createShare(
    user: { id: string },
    modelId: string,
    dto: {
      password?: string;
      expiresInDays?: number;
      maxViews?: number;
    } = {},
  ) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.userId !== user.id) {
      throw new ForbiddenException('You do not own this model');
    }

    const shareToken = crypto.randomBytes(6).toString('hex');

    let hashedPassword: string | null = null;
    let passwordPlain: string | null = null;
    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
      passwordPlain = dto.password;
    }

    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    }

    const share = await this.prisma.share.create({
      data: {
        modelId,
        shareToken,
        password: hashedPassword,
        passwordPlain,
        expiresAt,
        maxViews: dto.maxViews || null,
      },
    });

    return share;
  }

  async getSharesForModel(user: { id: string }, modelId: string) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.userId !== user.id) {
      throw new ForbiddenException('You do not own this model');
    }

    return this.prisma.share.findMany({
      where: { modelId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteShare(user: { id: string; role: string }, shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { model: true },
    });

    if (!share) {
      throw new NotFoundException('Share link not found');
    }

    if (share.model.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not own this share link');
    }

    try {
      await this.prisma.share.delete({
        where: { id: shareId },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Share link not found');
      }
      throw error;
    }

    return { message: 'Share link deleted successfully' };
  }

  async resetShareViews(user: { id: string; role: string }, shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { model: true },
    });

    if (!share) {
      throw new NotFoundException('Share link not found');
    }

    if (share.model.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not own this share link');
    }

    try {
      await this.prisma.share.update({
        where: { id: shareId },
        data: { views: 0 },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Share link not found');
      }
      throw error;
    }

    return { message: 'View count reset successfully' };
  }

  async getShareByToken(token: string) {
    const share = await this.prisma.share.findUnique({
      where: { shareToken: token },
      include: {
        model: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            photos: true,
            attachments: true,
            modelFiles: true,
            videos: true,
          },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Share link not found or invalid');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new ForbiddenException('This share link has expired');
    }

    // NOTE: maxViews is intentionally NOT blocked here.
    // The share page still loads so the frontend can show a "limit reached" banner.
    // Content access is enforced inside unlockShare below.

    const hasPassword = !!share.password;

    let richModelData: any = {
      id: share.model.id,
      name: share.model.name,
      size: share.model.size,
      createdAt: share.model.createdAt,
      user: share.model.user,
    };

    if (!hasPassword) {
      const fileUrl = share.model.fileUrl ? await this.modelsService.getModelForShare(share.model.fileUrl) : null;
      
      const photosWithUrls = await Promise.all(
        share.model.photos.map(async (photo) => ({
          ...photo,
          downloadUrl: await this.modelsService.getModelForShare(photo.fileUrl),
        }))
      );

      const attachmentsWithUrls = await Promise.all(
        share.model.attachments.map(async (attachment) => ({
          ...attachment,
          downloadUrl: await this.modelsService.getModelForShare(attachment.fileUrl),
        }))
      );

      const modelFilesWithUrls = await Promise.all(
        share.model.modelFiles.map(async (file) => ({
          ...file,
          downloadUrl: await this.modelsService.getModelForShare(file.fileUrl),
        }))
      );

      let finalModelFiles = modelFilesWithUrls;
      if (share.model.fileUrl && modelFilesWithUrls.length === 0) {
        const primaryUrl = fileUrl;
        finalModelFiles = [{
          id: 'legacy-primary',
          modelId: share.model.id,
          fileUrl: share.model.fileUrl,
          name: share.model.name + (share.model.fileUrl.endsWith('.gltf') ? '.gltf' : '.glb'),
          size: share.model.size || 0,
          createdAt: share.model.createdAt,
          downloadUrl: primaryUrl!,
        }];
      }

      const videosWithUrls = await Promise.all(
        share.model.videos.map(async (video) => ({
          ...video,
          downloadUrl: await this.modelsService.getModelForShare(video.fileUrl),
        }))
      );

      richModelData = {
        ...richModelData,
        description: share.model.description,
        fileUrl,
        photos: photosWithUrls,
        attachments: attachmentsWithUrls,
        modelFiles: finalModelFiles,
        videos: videosWithUrls,
      };
    }

    return {
      id: share.id,
      modelId: share.modelId,
      shareToken: share.shareToken,
      hasPassword,
      expiresAt: share.expiresAt,
      maxViews: share.maxViews,
      views: share.views,
      createdAt: share.createdAt,
      model: richModelData,
    };
  }

  async unlockShare(token: string, password?: string) {
    const share = await this.prisma.share.findUnique({
      where: { shareToken: token },
      include: { model: true },
    });

    if (!share) {
      throw new NotFoundException('Share link not found');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new ForbiddenException('This share link has expired');
    }

    if (share.maxViews && share.views >= share.maxViews) {
      throw new ForbiddenException('This share link has reached its maximum view limit');
    }

    if (share.password) {
      if (!password) {
        throw new BadRequestException('Password is required for this protected share link');
      }
      const isPasswordValid = await bcrypt.compare(password, share.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password');
      }
    }

    const fullModel = await this.prisma.model.findUnique({
      where: { id: share.modelId },
      include: {
        photos: true,
        attachments: true,
        modelFiles: true,
        videos: true,
      },
    });

    if (!fullModel) {
      throw new NotFoundException('Model not found');
    }

    const fileUrl = fullModel.fileUrl ? await this.modelsService.getModelForShare(fullModel.fileUrl) : null;
    
    const photosWithUrls = await Promise.all(
      fullModel.photos.map(async (photo) => ({
        ...photo,
        downloadUrl: await this.modelsService.getModelForShare(photo.fileUrl),
      }))
    );

    const attachmentsWithUrls = await Promise.all(
      fullModel.attachments.map(async (attachment) => ({
        ...attachment,
        downloadUrl: await this.modelsService.getModelForShare(attachment.fileUrl),
      }))
    );

    const modelFilesWithUrls = await Promise.all(
      fullModel.modelFiles.map(async (file) => ({
        ...file,
        downloadUrl: await this.modelsService.getModelForShare(file.fileUrl),
      }))
    );

    let finalModelFiles = modelFilesWithUrls;
    if (fullModel.fileUrl && modelFilesWithUrls.length === 0) {
      const primaryUrl = fileUrl;
      finalModelFiles = [{
        id: 'legacy-primary',
        modelId: fullModel.id,
        fileUrl: fullModel.fileUrl,
        name: fullModel.name + (fullModel.fileUrl.endsWith('.gltf') ? '.gltf' : '.glb'),
        size: fullModel.size || 0,
        createdAt: fullModel.createdAt,
        downloadUrl: primaryUrl!,
      }];
    }

    const videosWithUrls = await Promise.all(
      fullModel.videos.map(async (video) => ({
        ...video,
        downloadUrl: await this.modelsService.getModelForShare(video.fileUrl),
      }))
    );

    await this.prisma.share.update({
      where: { id: share.id },
      data: { views: { increment: 1 } },
    });

    return {
      message: 'Access granted',
      fileUrl,
      description: fullModel.description,
      photos: photosWithUrls,
      attachments: attachmentsWithUrls,
      modelFiles: finalModelFiles,
      videos: videosWithUrls,
      modelName: fullModel.name,
      size: fullModel.size,
    };
  }
}
