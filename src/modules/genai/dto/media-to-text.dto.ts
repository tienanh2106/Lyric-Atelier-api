import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export class MediaToTextDto {
  @ApiProperty({
    description: 'URL of the audio/video file to convert to text',
    example: 'https://example.com/audio.mp3',
  })
  @IsString()
  @IsUrl()
  mediaUrl: string;

  @ApiProperty({
    description: 'Media type (audio or video)',
    enum: MediaType,
    example: MediaType.AUDIO,
  })
  @IsEnum(MediaType)
  mediaType: MediaType;

  @ApiPropertyOptional({
    description:
      'Additional prompt to guide AI processing (e.g., "Transcribe this song lyrics", "Extract dialogue from this video")',
    example: 'Transcribe the audio and format as song lyrics',
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({
    description: 'Language of the media',
    example: 'vi',
    default: 'vi',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'AI model to use',
    example: 'gemini-pro',
    default: 'gemini-pro',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
