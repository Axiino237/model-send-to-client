import { Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { UTApi } from 'uploadthing/server';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  // ✅ Uploadthing (Priority 1 - Free, no credit card needed)
  private utapi: UTApi | null = null;

  // Cloudflare R2 (Priority 2 - needs credit card)
  private r2Client: S3Client | null = null;
  private r2BucketName: string | null = null;
  private r2PublicUrl: string | null = null;

  // AWS S3 (Legacy fallback)
  private s3Client: S3Client | null = null;
  private bucketName: string | null = null;

  // Supabase (Legacy fallback - 50MB limit)
  private supabaseClient: SupabaseClient | null = null;
  private supabaseBucket: string | null = null;

  private localUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // ✅ Priority 1: Uploadthing setup (Free 2GB, no credit card)
    const uploadthingToken = process.env.UPLOADTHING_TOKEN;

    if (uploadthingToken) {
      this.utapi = new UTApi({ token: uploadthingToken });
      this.logger.log('Storage: Uploadthing mode (Free 2GB, no credit card)');
      return;
    }

    // ⚠️ Priority 2: Cloudflare R2 setup (needs credit card)
    const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    this.r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || null;
    this.r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || null;

    if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && this.r2BucketName) {
      this.r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      });
      this.logger.log(`Storage: Cloudflare R2 mode (bucket: ${this.r2BucketName})`);
      return;
    }

    // ⚠️ Priority 3: AWS S3 setup (legacy)
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

    // ⚠️ Priority 4: Supabase Storage setup (legacy - 50MB limit)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    this.supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'model-files';

    if (supabaseUrl && supabaseKey) {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.logger.log(`Storage: Supabase Storage mode (bucket: ${this.supabaseBucket})`);
      return;
    }

    // ⚠️ Priority 5: Local filesystem fallback
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

    // ✅ Uploadthing (new uploads go here)
    if (this.utapi) {
      // Convert Buffer to File object (Node 20+ has File globally)
      const blob = new Blob([new Uint8Array(fileData)], { type: file.mimetype });
      const utFile = new File([blob], file.originalname || path.basename(key), {
        type: file.mimetype,
      });

      const response = await this.utapi.uploadFiles([utFile]);
      const result = response[0];

      if (result.error) {
        throw new Error(`Uploadthing upload failed: ${result.error.message}`);
      }

      // Store both the public URL and the key for deletion later
      const fileKey = result.data.key;
      const fileUrl = result.data.ufsUrl || result.data.url;
      this.logger.log(`Uploaded to Uploadthing: ${fileKey}`);

      // Return custom scheme with key embedded for deletion support
      return `uploadthing://${fileKey}::${fileUrl}`;
    }

    // Cloudflare R2 (legacy)
    if (this.r2Client && this.r2BucketName) {
      const command = new PutObjectCommand({
        Bucket: this.r2BucketName,
        Key: key,
        Body: fileData,
        ContentType: file.mimetype,
      });
      await this.r2Client.send(command);
      return `r2://${this.r2BucketName}/${key}`;
    }

    // AWS S3 (legacy)
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

    // Supabase Storage (legacy)
    if (this.supabaseClient && this.supabaseBucket) {
      const { error } = await this.supabaseClient.storage
        .from(this.supabaseBucket)
        .upload(key, fileData, {
          contentType: file.mimetype,
          upsert: true,
        });
      if (error) {
        if (error.message.includes('exceeded the maximum allowed size')) {
          throw new PayloadTooLargeException(
            'File size exceeds the Supabase Storage bucket limit (default is 50MB). Please go to Supabase Dashboard -> Storage -> Edit Bucket and increase the Maximum File Size limit (e.g. set it to 100MB or higher).'
          );
        }
        throw new Error(`Supabase upload failed: ${error.message}`);
      }
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
    // ✅ Uploadthing — extract the embedded public URL
    if (fileUrl.startsWith('uploadthing://')) {
      // Format: uploadthing://<key>::<publicUrl>
      const payload = fileUrl.replace('uploadthing://', '');
      const separatorIndex = payload.indexOf('::');
      if (separatorIndex !== -1) {
        return payload.substring(separatorIndex + 2); // return the public URL part
      }
      // Legacy fallback: treat whole thing as key and build URL
      const fileKey = payload;
      return `https://utfs.io/f/${fileKey}`;
    }

    // Cloudflare R2 (legacy)
    if (fileUrl.startsWith('r2://') && this.r2Client && this.r2BucketName) {
      const key = fileUrl.replace(`r2://${this.r2BucketName}/`, '');
      if (this.r2PublicUrl) {
        return `${this.r2PublicUrl}/${key}`;
      }
      const command = new GetObjectCommand({ Bucket: this.r2BucketName, Key: key });
      return await getSignedUrl(this.r2Client, command, { expiresIn: 900 });
    }

    // AWS S3 (legacy)
    if (fileUrl.startsWith('s3://') && this.s3Client && this.bucketName) {
      const key = fileUrl.replace(`s3://${this.bucketName}/`, '');
      const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    }

    // Supabase Storage (legacy)
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
      // ✅ Uploadthing
      if (fileUrl.startsWith('uploadthing://') && this.utapi) {
        const payload = fileUrl.replace('uploadthing://', '');
        const separatorIndex = payload.indexOf('::');
        const fileKey = separatorIndex !== -1
          ? payload.substring(0, separatorIndex)
          : payload;
        await this.utapi.deleteFiles([fileKey]);

      // Cloudflare R2 (legacy)
      } else if (fileUrl.startsWith('r2://') && this.r2Client && this.r2BucketName) {
        const key = fileUrl.replace(`r2://${this.r2BucketName}/`, '');
        await this.r2Client.send(new DeleteObjectCommand({ Bucket: this.r2BucketName, Key: key }));

      // AWS S3 (legacy)
      } else if (fileUrl.startsWith('s3://') && this.s3Client && this.bucketName) {
        const key = fileUrl.replace(`s3://${this.bucketName}/`, '');
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));

      // Supabase (legacy)
      } else if (fileUrl.startsWith('supabase://') && this.supabaseClient) {
        const parts = fileUrl.replace('supabase://', '').split('/');
        const bucket = parts[0];
        const key = parts.slice(1).join('/');
        await this.supabaseClient.storage.from(bucket).remove([key]);

      // Local fallback
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
