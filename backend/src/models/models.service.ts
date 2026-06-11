import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as path from 'path';
import * as fs from 'fs';

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
      videos?: Express.Multer.File[];
    },
    name: string,
    description?: string,
  ) {
    const modelFiles = files?.file || [];
    const photos = files?.photos || [];
    const attachments = files?.attachments || [];
    const videos = files?.videos || [];


    const allowedModelExtensions = ['.glb', '.gltf', '.fbx', '.obj'];
    const allowedVideoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];

    let fileUrl: string | null = null;
    let size: number | null = null;

    try {
      try {
        const primaryModelFile = modelFiles[0] || null;
        if (primaryModelFile) {
          const fileExt = path.extname(primaryModelFile.originalname).toLowerCase();
          if (!allowedModelExtensions.includes(fileExt)) {
            throw new BadRequestException(`Invalid file format for 3D Model: ${primaryModelFile.originalname}`);
          }
          const storageKey = `models/${user.id}/${Date.now()}-${primaryModelFile.originalname}`;
          fileUrl = await this.storage.uploadFile(primaryModelFile, storageKey);
          size = primaryModelFile.size;
        }

        const displayName = name || (primaryModelFile ? primaryModelFile.originalname.replace(path.extname(primaryModelFile.originalname), '') : 'Showcase');

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

        for (const mFile of modelFiles) {
          const fileExt = path.extname(mFile.originalname).toLowerCase();
          if (!allowedModelExtensions.includes(fileExt)) {
            throw new BadRequestException(`Invalid file format for 3D Model: ${mFile.originalname}`);
          }
          let mFileUrl = '';
          if (mFile === primaryModelFile) {
            mFileUrl = fileUrl!;
          } else {
            const storageKey = `models/${user.id}/${Date.now()}-${mFile.originalname}`;
            mFileUrl = await this.storage.uploadFile(mFile, storageKey);
          }

          await this.prisma.modelFile.create({
            data: {
              modelId: model.id,
              fileUrl: mFileUrl,
              name: mFile.originalname,
              size: mFile.size,
            },
          });
        }

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

        for (const video of videos) {
          const videoExt = path.extname(video.originalname).toLowerCase();
          if (!allowedVideoExtensions.includes(videoExt)) {
            throw new BadRequestException(`Invalid file format for Video: ${video.originalname}`);
          }
          const videoKey = `videos/${user.id}/${Date.now()}-${video.originalname}`;
          const videoUrl = await this.storage.uploadFile(video, videoKey);
          await this.prisma.video.create({
            data: {
              modelId: model.id,
              fileUrl: videoUrl,
              name: video.originalname,
              size: video.size,
            },
          });
        }

        return model;
      } catch (err) {
        console.error('[ModelsService.uploadModel] Error occurred during upload:', err);
        throw err;
      }
    } finally {
      const allFiles = [
        ...(files?.file || []),
        ...(files?.photos || []),
        ...(files?.attachments || []),
        ...(files?.videos || []),
      ];
      for (const f of allFiles) {
        if (f.path && fs.existsSync(f.path)) {
          try {
            fs.unlinkSync(f.path);
          } catch (err) {
            // ignore error
          }
        }
      }
    }
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
        modelFiles: true,
        videos: true,
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

        const modelFilesWithUrls = await Promise.all(
          model.modelFiles.map(async (file) => ({
            ...file,
            downloadUrl: await this.storage.getDownloadUrl(file.fileUrl),
          }))
        );

        let finalModelFiles = modelFilesWithUrls;
        if (model.fileUrl && modelFilesWithUrls.length === 0) {
          finalModelFiles = [{
            id: 'legacy-primary',
            modelId: model.id,
            fileUrl: model.fileUrl,
            name: model.name + (model.fileUrl.endsWith('.gltf') ? '.gltf' : '.glb'),
            size: model.size || 0,
            createdAt: model.createdAt,
            downloadUrl: downloadUrl!,
          }];
        }

        const videosWithUrls = await Promise.all(
          model.videos.map(async (video) => ({
            ...video,
            downloadUrl: await this.storage.getDownloadUrl(video.fileUrl),
          }))
        );

        return {
          ...model,
          downloadUrl,
          photos: photosWithUrls,
          attachments: attachmentsWithUrls,
          modelFiles: finalModelFiles,
          videos: videosWithUrls,
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
        modelFiles: true,
        videos: true,
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

    for (const mFile of model.modelFiles) {
      if (mFile.fileUrl !== model.fileUrl) {
        await this.storage.deleteFile(mFile.fileUrl);
      }
    }

    for (const video of model.videos) {
      await this.storage.deleteFile(video.fileUrl);
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

