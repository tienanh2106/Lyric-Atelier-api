import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScenarioType {
  MUSIC_LYRICS = 'music_lyrics',
  STORY_WRITING = 'story_writing',
  MARKETING = 'marketing',
  CREATIVE_WRITING = 'creative_writing',
  GENERAL = 'general',
}

export class SuggestScenarioDto {
  @ApiProperty({
    description: 'Brief description of your needs',
    example: 'I want to write song lyrics about love',
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Type of scenario to suggest',
    enum: ScenarioType,
    example: ScenarioType.MUSIC_LYRICS,
    default: ScenarioType.GENERAL,
  })
  @IsOptional()
  @IsEnum(ScenarioType)
  scenarioType?: ScenarioType;

  @ApiPropertyOptional({
    description: 'Number of suggestions to receive',
    example: 3,
    default: 3,
  })
  @IsOptional()
  numberOfSuggestions?: number;
}
