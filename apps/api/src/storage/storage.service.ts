import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface UploadedFileResult {
  key: string;        // R2 object key (or local filename)
  url: string;        // presigned download URL (or local path reference)
  fileName: string;   // original filename
  fileSize: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;
  private readonly accountId: string;
  private readonly useR2: boolean;
  private readonly localUploadDir: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId     = this.config.get<string>('R2_ACCESS_KEY_ID') || this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY') || this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.accountId        = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID') || '';
    this.bucket           = this.config.get<string>('STORAGE_BUCKET') || 'hiretrack-files';
    this.localUploadDir   = join(process.cwd(), 'uploads', 'resumes');

    const hasR2Creds = !!(accessKeyId && secretAccessKey && this.accountId);

    if (hasR2Creds) {
      // Cloudflare R2 endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
      // Region is always "auto" for R2
      const endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;

      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
        // Required for R2: path-style access
        forcePathStyle: true,
      });

      this.useR2 = true;
      this.logger.log(`✅ StorageService: Cloudflare R2 (bucket: ${this.bucket}, endpoint: ${endpoint})`);
    } else {
      this.useR2 = false;
      // Ensure local upload dir exists
      if (!existsSync(this.localUploadDir)) {
        mkdirSync(this.localUploadDir, { recursive: true });
      }
      this.logger.warn(`⚠️  StorageService: R2 credentials missing — using local disk (${this.localUploadDir})`);
      this.logger.warn(`   Requires: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY`);
    }
  }

  /** Upload a file buffer to R2 or local disk. Returns key + signed URL. */
  async upload(
    fileBuffer: Buffer,
    originalName: string,
    mimetype: string,
    prefix = 'resumes',
  ): Promise<UploadedFileResult> {
    const ext      = extname(originalName);
    const key      = `${prefix}/${randomUUID()}${ext}`;
    const fileSize = fileBuffer.length;

    if (this.useR2 && this.s3) {
      this.logger.log(`📤 Uploading ${originalName} → R2 key: ${key}`);

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimetype,
          ContentDisposition: `attachment; filename="${originalName}"`,
        }),
      );

      // Generate a 7-day presigned URL for immediate use
      const url = await this.getSignedDownloadUrl(key);
      this.logger.log(`✅ Uploaded to R2: ${key}`);
      return { key, url, fileName: originalName, fileSize };
    }

    // ── Local disk fallback ────────────────────────────────────
    const filename = `${randomUUID()}${ext}`;
    const localPath = join(this.localUploadDir, filename);
    writeFileSync(localPath, fileBuffer);
    this.logger.log(`📁 Saved locally: ${localPath}`);
    return { key: filename, url: `/local/${filename}`, fileName: originalName, fileSize };
  }

  /** Generate a presigned URL valid for 7 days (R2) */
  async getSignedDownloadUrl(key: string, expiresInSeconds = 7 * 24 * 3600): Promise<string> {
    if (!this.useR2 || !this.s3) {
      // Local: return relative path — controller handles file send
      return `/local/${key}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
    return url;
  }

  /** Delete a file from R2 or local disk */
  async delete(key: string): Promise<void> {
    if (this.useR2 && this.s3) {
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      this.logger.log(`🗑️  Deleted R2 object: ${key}`);
      return;
    }

    // Local fallback delete
    const localPath = join(this.localUploadDir, key);
    if (existsSync(localPath)) {
      const fs = require('fs');
      fs.unlinkSync(localPath);
      this.logger.log(`🗑️  Deleted local file: ${localPath}`);
    }
  }

  /** Stream a local file (for the download endpoint when R2 is not used) */
  getLocalReadStream(key: string) {
    const localPath = join(this.localUploadDir, key);
    if (!existsSync(localPath)) return null;
    return createReadStream(localPath);
  }

  get isUsingR2(): boolean {
    return this.useR2;
  }
}
