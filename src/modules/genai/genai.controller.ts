import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GenAIService } from './genai.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('GenAI')
@Controller('genai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenAIController {
  constructor(private readonly genAIService: GenAIService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate content using AI' })
  @ApiResponse({ status: 201, description: 'Content generated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient credits or invalid prompt',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  generateContent(
    @CurrentUser() user: User,
    @Body() generateDto: GenerateContentDto,
  ) {
    return this.genAIService.generateContent(user.id, generateDto);
  }

  @Get('cost-estimate')
  @ApiOperation({ summary: 'Estimate credit cost for generation' })
  @ApiResponse({ status: 200, description: 'Cost estimation retrieved' })
  estimateCost(
    @Query('prompt') prompt: string,
    @Query('maxTokens') maxTokens?: number,
  ) {
    return this.genAIService.estimateCost(prompt, maxTokens);
  }
}
