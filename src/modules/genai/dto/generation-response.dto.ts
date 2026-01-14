import { ApiProperty } from '@nestjs/swagger';

export class GenerationDataDto {
  @ApiProperty({
    description: 'Generated text content',
    example:
      'Code flows like a stream\nBugs hide in shadows deep\nDebug and deploy',
  })
  generatedText: string;

  @ApiProperty({
    description: 'Credits used for generation',
    example: 5,
  })
  creditsUsed: number;

  @ApiProperty({
    description: 'Tokens used in generation',
    example: 50,
  })
  tokensUsed: number;

  @ApiProperty({
    description: 'Remaining credits after generation',
    example: 95,
  })
  remainingCredits: number;
}

export class GenerationResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Content generated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Generation data',
    type: GenerationDataDto,
  })
  data: GenerationDataDto;
}

export class CostEstimationDto {
  @ApiProperty({
    description: 'Estimated tokens for generation',
    example: 150,
  })
  estimatedTokens: number;

  @ApiProperty({
    description: 'Estimated credit cost',
    example: 2,
  })
  estimatedCost: number;

  @ApiProperty({
    description: 'Cost per token',
    example: 0.01,
  })
  costPerToken: number;
}
