import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Request,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModelsService } from './models.service';
import { StorageService } from '../storage/storage.service';
import type { Response } from 'express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('models')
export class ModelsController {
  constructor(
    private modelsService: ModelsService,
    private storageService: StorageService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 10 },
        { name: 'photos', maxCount: 10 },
        { name: 'attachments', maxCount: 10 },
        { name: 'videos', maxCount: 10 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            const tempDir = path.join(process.cwd(), 'uploads', 'temp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            cb(null, tempDir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
          },
        }),
      },
    ),
  )
  async uploadModel(
    @Request() req,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      attachments?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    return this.modelsService.uploadModel(req.user, files, name, description);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getModels(@Request() req, @Query('search') search: string) {
    return this.modelsService.getModels(req.user, search);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async renameModel(
    @Request() req,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.modelsService.renameModel(req.user, id, name);
  }

  @Patch(':id/update')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 10 },
        { name: 'photos', maxCount: 10 },
        { name: 'attachments', maxCount: 10 },
        { name: 'videos', maxCount: 10 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            const tempDir = path.join(process.cwd(), 'uploads', 'temp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            cb(null, tempDir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
          },
        }),
      },
    ),
  )
  async updateModel(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      photos?: Express.Multer.File[];
      attachments?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
    @Body('name') name?: string,
    @Body('description') description?: string,
    @Body('deleteModelFileIds') deleteModelFileIdsJson?: string,
    @Body('deletePhotoIds') deletePhotoIdsJson?: string,
    @Body('deleteAttachmentIds') deleteAttachmentIdsJson?: string,
    @Body('deleteVideoIds') deleteVideoIdsJson?: string,
  ) {
    const deleteModelFileIds = deleteModelFileIdsJson ? JSON.parse(deleteModelFileIdsJson) : [];
    const deletePhotoIds = deletePhotoIdsJson ? JSON.parse(deletePhotoIdsJson) : [];
    const deleteAttachmentIds = deleteAttachmentIdsJson ? JSON.parse(deleteAttachmentIdsJson) : [];
    const deleteVideoIds = deleteVideoIdsJson ? JSON.parse(deleteVideoIdsJson) : [];

    return this.modelsService.updateModel(
      req.user,
      id,
      files,
      name,
      description,
      deleteModelFileIds,
      deletePhotoIds,
      deleteAttachmentIds,
      deleteVideoIds,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteModel(@Request() req, @Param('id') id: string) {
    return this.modelsService.deleteModel(req.user, id);
  }

  @Get('download/:type/:userId/:filename')
  async downloadLocalFile(
    @Param('type') type: string,
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!['models', 'photos', 'attachments', 'videos'].includes(type)) {
      throw new NotFoundException('Invalid file type');
    }
    const key = `${type}/${userId}/${filename}`;
    const filePath = this.storageService.getLocalFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Strip timestamp prefix if it exists to restore original filename on download
    let clientFilename = filename;
    const hyphenIndex = filename.indexOf('-');
    if (hyphenIndex !== -1) {
      const prefix = filename.substring(0, hyphenIndex);
      if (/^\d+$/.test(prefix)) {
        clientFilename = filename.substring(hyphenIndex + 1);
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(clientFilename)}"`,
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}

