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

    if (
      modelFiles.length === 0 &&
      photos.length === 0 &&
      attachments.length === 0 &&
      videos.length === 0 &&
      (!description || !description.trim())
    ) {
      throw new BadRequestException('At least one content field (3D model, photo, video, document, or description) must be added.');
    }

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

    const fileUrlsToDelete: string[] = [];
    if (model.fileUrl) fileUrlsToDelete.push(model.fileUrl);
    model.photos.forEach(p => fileUrlsToDelete.push(p.fileUrl));
    model.attachments.forEach(a => fileUrlsToDelete.push(a.fileUrl));
    model.modelFiles.forEach(m => {
      if (m.fileUrl !== model.fileUrl) fileUrlsToDelete.push(m.fileUrl);
    });
    model.videos.forEach(v => fileUrlsToDelete.push(v.fileUrl));

    // Fire and forget storage deletions in parallel in the background
    if (fileUrlsToDelete.length > 0) {
      Promise.all(fileUrlsToDelete.map(url => this.storage.deleteFile(url)))
        .catch(err => console.error('Failed to delete files in background:', err));
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

  async updateModel(
    user: { id: string; role: string },
    modelId: string,
    files: {
      file?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      attachments?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
    name?: string,
    description?: string,
    deleteModelFileIds: string[] = [],
    deletePhotoIds: string[] = [],
    deleteAttachmentIds: string[] = [],
    deleteVideoIds: string[] = [],
  ) {
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
      throw new ForbiddenException('You do not have permission to modify this model');
    }

    const urlsToDelete: string[] = [];

    // Process database deletions first and collect storage URLs to delete in background
    for (const id of deleteModelFileIds) {
      const file = model.modelFiles.find((f) => f.id === id);
      if (file) {
        urlsToDelete.push(file.fileUrl);
        await this.prisma.modelFile.delete({ where: { id } });
      }
    }

    for (const id of deletePhotoIds) {
      const photo = model.photos.find((p) => p.id === id);
      if (photo) {
        urlsToDelete.push(photo.fileUrl);
        await this.prisma.photo.delete({ where: { id } });
      }
    }

    for (const id of deleteAttachmentIds) {
      const attachment = model.attachments.find((a) => a.id === id);
      if (attachment) {
        urlsToDelete.push(attachment.fileUrl);
        await this.prisma.attachment.delete({ where: { id } });
      }
    }

    for (const id of deleteVideoIds) {
      const video = model.videos.find((v) => v.id === id);
      if (video) {
        urlsToDelete.push(video.fileUrl);
        await this.prisma.video.delete({ where: { id } });
      }
    }

    // Fire and forget storage deletions in background
    if (urlsToDelete.length > 0) {
      Promise.all(urlsToDelete.map(url => this.storage.deleteFile(url)))
        .catch(err => console.error('Failed to delete files in background:', err));
    }

    const modelFiles = files?.file || [];
    const photos = files?.photos || [];
    const attachments = files?.attachments || [];
    const videos = files?.videos || [];

    const allowedModelExtensions = ['.glb', '.gltf', '.fbx', '.obj'];
    const allowedVideoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];

    try {
      // Process new 3D model files
      for (const mFile of modelFiles) {
        const fileExt = path.extname(mFile.originalname).toLowerCase();
        if (!allowedModelExtensions.includes(fileExt)) {
          throw new BadRequestException(`Invalid file format for 3D Model: ${mFile.originalname}`);
        }
        const storageKey = `models/${model.userId}/${Date.now()}-${mFile.originalname}`;
        const mFileUrl = await this.storage.uploadFile(mFile, storageKey);

        await this.prisma.modelFile.create({
          data: {
            modelId: model.id,
            fileUrl: mFileUrl,
            name: mFile.originalname,
            size: mFile.size,
          },
        });
      }

      // Process new photos
      for (const photo of photos) {
        const photoKey = `photos/${model.userId}/${Date.now()}-${photo.originalname}`;
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

      // Process new attachments
      for (const attachment of attachments) {
        const attachmentKey = `attachments/${model.userId}/${Date.now()}-${attachment.originalname}`;
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

      // Process new videos
      for (const video of videos) {
        const videoExt = path.extname(video.originalname).toLowerCase();
        if (!allowedVideoExtensions.includes(videoExt)) {
          throw new BadRequestException(`Invalid file format for Video: ${video.originalname}`);
        }
        const videoKey = `videos/${model.userId}/${Date.now()}-${video.originalname}`;
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

      // Refresh files list after modifications
      const freshModelFiles = await this.prisma.modelFile.findMany({
        where: { modelId: model.id },
      });
      const freshPhotos = await this.prisma.photo.findMany({ where: { modelId: model.id } });
      const freshVideos = await this.prisma.video.findMany({ where: { modelId: model.id } });
      const freshAttachments = await this.prisma.attachment.findMany({ where: { modelId: model.id } });
      const freshDescription = description !== undefined ? description : model.description;

      if (
        freshModelFiles.length === 0 &&
        freshPhotos.length === 0 &&
        freshVideos.length === 0 &&
        freshAttachments.length === 0 &&
        (!freshDescription || !freshDescription.trim())
      ) {
        throw new BadRequestException('At least one content field (3D model, photo, video, document, or description) must be added.');
      }

      // Update primary fileUrl and size on Model if necessary
      let updatedFileUrl = model.fileUrl;
      let updatedSize = model.size;

      // If existing primary file URL is deleted or empty, set to first available ModelFile URL
      const primaryDeletedOrMissing = model.fileUrl && !freshModelFiles.some((f) => f.fileUrl === model.fileUrl);
      if (!model.fileUrl || primaryDeletedOrMissing) {
        if (freshModelFiles.length > 0) {
          updatedFileUrl = freshModelFiles[0].fileUrl;
          updatedSize = freshModelFiles[0].size;
        } else {
          updatedFileUrl = null;
          updatedSize = null;
        }
      }

      // Save overall name and description
      const updatedModel = await this.prisma.model.update({
        where: { id: modelId },
        data: {
          name: name !== undefined ? (name || 'Showcase') : undefined,
          description: description !== undefined ? (description || null) : undefined,
          fileUrl: updatedFileUrl,
          size: updatedSize,
        },
      });

      return updatedModel;
    } catch (err) {
      console.error('[ModelsService.updateModel] Error occurred during update:', err);
      throw err;
    } finally {
      const allFiles = [
        ...modelFiles,
        ...photos,
        ...attachments,
        ...videos,
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

  async getModelForShare(fileUrl: string) {
    return this.storage.getDownloadUrl(fileUrl);
  }
}

