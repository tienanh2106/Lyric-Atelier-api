import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('media')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    operationId: 'uploadMedia',
    summary: 'Upload media file (audio/video)',
    description:
      'Upload an audio or video file to cloud storage. Returns a public URL that can be used with media-to-text API. Max file size: 100MB.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Media file (audio or video)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file too large',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadMedia(
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    return this.uploadService.uploadMedia(file);
  }

  @Delete('media/*fileName')
  @ApiOperation({
    operationId: 'deleteMedia',
    summary: 'Delete media file from storage',
    description:
      'Delete a media file from cloud storage. Provide the full file path (e.g., media/1234567890-song.mp3)',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'File deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'File not found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMedia(@Param('fileName') fileName: string) {
    return this.uploadService.deleteMedia(fileName);
  }
}
