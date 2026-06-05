import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private localUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || null;

    if (accessKeyId && secretAccessKey && region && this.bucketName) {
      this.s3Client = new S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region,
      });
      this.logger.log('Storage Service initialized in AWS S3 mode.');
    } else {
      this.logger.log('AWS S3 credentials missing. Storage Service initialized in Local Filesystem fallback mode.');
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    }
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    if (this.s3Client && this.bucketName) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      await this.s3Client.send(command);
      return `s3://${this.bucketName}/${key}`;
    } else {
      const filePath = path.join(this.localUploadDir, key);
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      await fs.promises.writeFile(filePath, file.buffer);
      return `local://${key}`;
    }
  }

  async getDownloadUrl(fileUrl: string): Promise<string> {
    if (fileUrl.startsWith('s3://') && this.s3Client && this.bucketName) {
      const key = fileUrl.replace(`s3://${this.bucketName}/`, '');
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    } else if (fileUrl.startsWith('local://')) {
      const key = fileUrl.replace('local://', '');
      return `/api/models/download/${key}`;
    }
    return fileUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (fileUrl.startsWith('s3://') && this.s3Client && this.bucketName) {
        const key = fileUrl.replace(`s3://${this.bucketName}/`, '');
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        await this.s3Client.send(command);
      } else if (fileUrl.startsWith('local://')) {
        const key = fileUrl.replace('local://', '');
        const filePath = path.join(this.localUploadDir, key);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to delete file: ${fileUrl}`, err.stack);
    }
  }

  getLocalFilePath(key: string): string {
    return path.join(this.localUploadDir, key);
  }
}
