import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;
  private supabaseClient: SupabaseClient | null = null;
  private supabaseBucket: string | null = null;
  private localUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // AWS S3 setup
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || null;

    if (accessKeyId && secretAccessKey && region && this.bucketName) {
      this.s3Client = new S3Client({
        credentials: { accessKeyId, secretAccessKey },
        region,
      });
      this.logger.log('Storage: AWS S3 mode');
      return;
    }

    // Supabase Storage setup
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    this.supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'model-files';

    if (supabaseUrl && supabaseKey) {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.logger.log(`Storage: Supabase Storage mode (bucket: ${this.supabaseBucket})`);
      return;
    }

    // Local filesystem fallback
    this.logger.warn('Storage: Local Filesystem fallback mode (files lost on redeploy!)');
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    const fileData = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
    if (!fileData) {
      throw new Error('No file data available (both buffer and path are missing)');
    }

    // AWS S3
    if (this.s3Client && this.bucketName) {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileData,
        ContentType: file.mimetype,
      });
      await this.s3Client.send(command);
      return `s3://${this.bucketName}/${key}`;
    }

    // Supabase Storage
    if (this.supabaseClient && this.supabaseBucket) {
      const { error } = await this.supabaseClient.storage
        .from(this.supabaseBucket)
        .upload(key, fileData, {
          contentType: file.mimetype,
          upsert: true,
        });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      return `supabase://${this.supabaseBucket}/${key}`;
    }

    // Local fallback
    const filePath = path.join(this.localUploadDir, key);
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    await fs.promises.writeFile(filePath, fileData);
    return `local://${key}`;
  }

  async getDownloadUrl(fileUrl: string): Promise<string> {
    // AWS S3
    if (fileUrl.startsWith('s3://') && this.s3Client && this.bucketName) {
      const key = fileUrl.replace(`s3://${this.bucketName}/`, '');
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    }

    // Supabase Storage
    if (fileUrl.startsWith('supabase://') && this.supabaseClient) {
      const parts = fileUrl.replace('supabase://', '').split('/');
      const bucket = parts[0];
      const key = parts.slice(1).join('/');
      const { data } = this.supabaseClient.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    }

    // Local fallback
    if (fileUrl.startsWith('local://')) {
      const key = fileUrl.replace('local://', '');
      return `/api/models/download/${key}`;
    }

    return fileUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (fileUrl.startsWith('s3://') && this.s3Client && this.bucketName) {
        const key = fileUrl.replace(`s3://${this.bucketName}/`, '');
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
      } else if (fileUrl.startsWith('supabase://') && this.supabaseClient) {
        const parts = fileUrl.replace('supabase://', '').split('/');
        const bucket = parts[0];
        const key = parts.slice(1).join('/');
        await this.supabaseClient.storage.from(bucket).remove([key]);
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
