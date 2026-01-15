import { ApiProperty } from '@nestjs/swagger';

export class UploadDataDto {
  @ApiProperty({
    description: 'Public URL of the uploaded file',
    example:
      'https://storage.googleapis.com/bucket-name/media/1234567890-song.mp3',
  })
  url: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'song.mp3',
  })
  fileName: string;

  @ApiProperty({
    description: 'Content type of the file',
    example: 'audio/mpeg',
  })
  contentType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 5242880,
  })
  size: number;
}

export class UploadResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'File uploaded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Upload data',
    type: UploadDataDto,
  })
  data: UploadDataDto;
}
