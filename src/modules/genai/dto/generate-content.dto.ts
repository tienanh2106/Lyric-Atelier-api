import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateContentDto {
  @ApiProperty({
    description: 'The prompt for AI content generation',
    example: 'Write a haiku about coding',
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Maximum number of tokens to generate',
    example: 500,
    minimum: 1,
    maximum: 2048,
    default: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2048)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'AI model to use',
    example: 'gemini-pro',
    default: 'gemini-pro',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
