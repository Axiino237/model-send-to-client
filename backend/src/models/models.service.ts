import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as path from 'path';

@Injectable()
export class ModelsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async uploadModel(
    user: { id: string },
    files: {
      file?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      attachments?: Express.Multer.File[];
    },
    name: string,
    description?: string,
  ) {
    const file = files?.file?.[0] || null;
    const photos = files?.photos || [];
    const attachments = files?.attachments || [];

    if (!file && photos.length === 0 && !description) {
      throw new BadRequestException('At least a 3D model file, photos, or description is required');
    }

    let fileUrl: string | null = null;
    let size: number | null = null;

    if (file) {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = ['.glb', '.gltf', '.fbx', '.obj'];
      if (!allowedExtensions.includes(fileExt)) {
        throw new BadRequestException(`Invalid file format. Supported formats: ${allowedExtensions.join(', ')}`);
      }

      const storageKey = `models/${user.id}/${Date.now()}-${file.originalname}`;
      fileUrl = await this.storage.uploadFile(file, storageKey);
      size = file.size;
    }

    const displayName = name || (file ? file.originalname.replace(path.extname(file.originalname), '') : 'Showcase');

    const model = await this.prisma.model.create({
      data: {
        userId: user.id,
        name: displayName,
        description: description || null,
        fileUrl,
        size,
        thumbnail: null,
      },
    });

    for (const photo of photos) {
      const photoKey = `photos/${user.id}/${Date.now()}-${photo.originalname}`;
      const photoUrl = await this.storage.uploadFile(photo, photoKey);
      await this.prisma.photo.create({
        data: {
          modelId: model.id,
          fileUrl: photoUrl,
          name: photo.originalname,
          size: photo.size,
        },
      });
    }

    for (const attachment of attachments) {
      const attachmentKey = `attachments/${user.id}/${Date.now()}-${attachment.originalname}`;
      const attachmentUrl = await this.storage.uploadFile(attachment, attachmentKey);
      await this.prisma.attachment.create({
        data: {
          modelId: model.id,
          fileUrl: attachmentUrl,
          name: attachment.originalname,
          size: attachment.size,
        },
      });
    }

    return model;
  }

  async getModels(user: { id: string; role: string }, search?: string) {
    const where: any = {};
    
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }

    if (search) {
      where.name = {
        contains: search,
      };
    }

    const models = await this.prisma.model.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shares: {
          select: {
            id: true,
            shareToken: true,
            expiresAt: true,
            maxViews: true,
            views: true,
            passwordPlain: true,
          },
        },
        photos: true,
        attachments: true,
      },
    });

    return await Promise.all(
      models.map(async (model) => {
        const downloadUrl = model.fileUrl ? await this.storage.getDownloadUrl(model.fileUrl) : null;
        
        const photosWithUrls = await Promise.all(
          model.photos.map(async (photo) => ({
            ...photo,
            downloadUrl: await this.storage.getDownloadUrl(photo.fileUrl),
          }))
        );

        const attachmentsWithUrls = await Promise.all(
          model.attachments.map(async (attachment) => ({
            ...attachment,
            downloadUrl: await this.storage.getDownloadUrl(attachment.fileUrl),
          }))
        );

        return {
          ...model,
          downloadUrl,
          photos: photosWithUrls,
          attachments: attachmentsWithUrls,
        };
      })
    );
  }

  async renameModel(user: { id: string; role: string }, modelId: string, name: string) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to modify this model');
    }

    return this.prisma.model.update({
      where: { id: modelId },
      data: { name },
    });
  }

  async deleteModel(user: { id: string; role: string }, modelId: string) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      include: {
        photos: true,
        attachments: true,
      },
    });

    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (model.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have permission to delete this model');
    }

    if (model.fileUrl) {
      await this.storage.deleteFile(model.fileUrl);
    }

    for (const photo of model.photos) {
      await this.storage.deleteFile(photo.fileUrl);
    }

    for (const attachment of model.attachments) {
      await this.storage.deleteFile(attachment.fileUrl);
    }

    try {
      await this.prisma.model.delete({
        where: { id: modelId },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Model not found');
      }
      throw error;
    }

    return { message: 'Model deleted successfully' };
  }

  async getModelForShare(fileUrl: string) {
    return this.storage.getDownloadUrl(fileUrl);
  }
}

