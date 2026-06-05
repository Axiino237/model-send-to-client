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
        { name: 'file', maxCount: 1 },
        { name: 'photos', maxCount: 10 },
        { name: 'attachments', maxCount: 10 },
      ],
      {
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
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
    if (!['models', 'photos', 'attachments'].includes(type)) {
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

