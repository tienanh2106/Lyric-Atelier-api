import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class GenerateContentDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2048)
  maxTokens?: number;

  @IsOptional()
  @IsString()
  model?: string;
}
