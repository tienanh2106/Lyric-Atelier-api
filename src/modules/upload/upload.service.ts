import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Storage } from '@google-cloud/storage';
import { ErrorCode } from '../../common/enums/error-code.enum';

interface ValidatedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Type guard function
function isValidFile(
  file: Express.Multer.File | undefined,
): file is Express.Multer.File & ValidatedFile {
  return !!(
    file &&
    file.buffer &&
    file.mimetype &&
    file.originalname &&
    typeof file.size === 'number'
  );
}

export interface UploadResult {
  message: string;
  data: {
    url: string;
    fileName: string;
    contentType: string;
    size: number;
  };
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly storage: Storage | null;
  private readonly bucketName: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get<string>('storage.projectId');
    const keyFilename = this.configService.get<string>('storage.keyFilename');
    this.bucketName =
      this.configService.get<string>('storage.bucketName') ?? '';

    // Check if GCS is configured
    this.isConfigured = !!(projectId && this.bucketName);

    if (this.isConfigured) {
      this.storage = new Storage({
        projectId,
        keyFilename,
      });
    } else {
      this.storage = null;
    }
  }

  async uploadMedia(
    file: Express.Multer.File | undefined,
  ): Promise<UploadResult> {
    // Check if GCS is configured
    if (!this.isConfigured || !this.storage) {
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message:
          'Google Cloud Storage is not configured. Please set GCS_PROJECT_ID, GCS_BUCKET_NAME, and GCS_KEY_FILENAME environment variables.',
      });
    }

    // Use type guard to validate file
    if (!isValidFile(file)) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_PROMPT,
        message: 'No file provided or file is invalid',
      });
    }

    // After validation, extract properties
    // Type guard ensures all properties exist with correct types
    // ESLint disabled: Express.Multer.File type not fully recognized by strict type checking
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const validFile: ValidatedFile = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    // Validate file type (audio/video only)
    const allowedMimeTypes: string[] = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (!allowedMimeTypes.includes(validFile.mimetype)) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_PROMPT,
        message: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      });
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (validFile.size > maxSize) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_PROMPT,
        message: 'File size exceeds 100MB limit',
      });
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const timestamp = Date.now();
      const fileName = `media/${timestamp}-${validFile.originalname}`;
      const fileUpload = bucket.file(fileName);

      // Save file to GCS with metadata including upload timestamp
      await fileUpload.save(validFile.buffer, {
        metadata: {
          contentType: validFile.mimetype,
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: validFile.originalname,
          },
        },
        public: true,
      });

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

      return {
        message: 'File uploaded successfully',
        data: {
          url: publicUrl,
          fileName: validFile.originalname,
          contentType: validFile.mimetype,
          size: validFile.size,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message: `Failed to upload file: ${errorMessage}`,
      });
    }
  }

  async deleteMedia(fileName: string): Promise<{ message: string }> {
    if (!this.isConfigured || !this.storage) {
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message: 'Google Cloud Storage is not configured.',
      });
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new BadRequestException({
          errorCode: ErrorCode.INVALID_PROMPT,
          message: 'File not found',
        });
      }

      // Delete file
      await file.delete();

      this.logger.log(`File deleted: ${fileName}`);

      return {
        message: 'File deleted successfully',
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message: `Failed to delete file: ${errorMessage}`,
      });
    }
  }

  // Run every 10 minutes to cleanup files older than 30 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupOldFiles(): Promise<void> {
    if (!this.isConfigured || !this.storage) {
      this.logger.warn('GCS not configured, skipping cleanup');
      return;
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({
        prefix: 'media/',
      });

      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      let deletedCount = 0;

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const uploadedAt = metadata.metadata?.uploadedAt;

        if (uploadedAt && typeof uploadedAt === 'string') {
          const uploadDate = new Date(uploadedAt);

          if (uploadDate < thirtyMinutesAgo) {
            await file.delete();
            deletedCount++;
            this.logger.log(`Deleted old file: ${file.name}`);
          }
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`Cleanup completed: ${deletedCount} file(s) deleted`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cleanup failed: ${errorMessage}`);
    }
  }
}
