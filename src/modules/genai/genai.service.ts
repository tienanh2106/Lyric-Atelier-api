import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CreditsService } from '../credits/credits.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { ErrorCode } from '../../common/enums/error-code.enum';

export interface GenerationResult {
  message: string;
  data: {
    generatedText: string;
    creditsUsed: number;
    tokensUsed: number;
    remainingCredits: number;
  };
}

export interface CostEstimation {
  estimatedTokens: number;
  estimatedCost: number;
  costPerToken: number;
}

interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  expiredCredits: number;
  creditsExpiringSoon: number;
}

@Injectable()
export class GenAIService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly creditCostPerToken: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly creditsService: CreditsService,
  ) {
    const apiKey = this.configService.get<string>('genai.apiKey');
    if (!apiKey) {
      throw new Error('Google GenAI API key is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.creditCostPerToken =
      this.configService.get<number>('credits.costPerToken') ?? 0.01;
  }

  async generateContent(
    userId: string,
    generateDto: GenerateContentDto,
  ): Promise<GenerationResult> {
    const { prompt, maxTokens = 500, model = 'gemini-pro' } = generateDto;

    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_PROMPT,
        message: 'Prompt cannot be empty',
      });
    }

    // Estimate credit cost (rough estimation based on prompt length)
    const estimatedTokens = Math.ceil(prompt.length / 4) + maxTokens;
    const estimatedCost = Math.ceil(estimatedTokens * this.creditCostPerToken);

    // Check if user has enough credits
    const balance = (await this.creditsService.getCreditBalance(
      userId,
    )) as CreditBalance;
    if (balance.availableCredits < estimatedCost) {
      throw new BadRequestException({
        errorCode: ErrorCode.INSUFFICIENT_CREDITS,
        message: `Insufficient credits. Available: ${balance.availableCredits}, Estimated cost: ${estimatedCost}`,
      });
    }

    let generatedText = '';
    let actualCost = 0;

    try {
      // Call Google GenAI
      const genModel = this.genAI.getGenerativeModel({ model });
      const result = await genModel.generateContent(prompt);
      const response = result.response;
      generatedText = response.text();

      // Calculate actual cost based on response
      const actualTokens = Math.ceil(
        (prompt.length + generatedText.length) / 4,
      );
      actualCost = Math.ceil(actualTokens * this.creditCostPerToken);

      // Deduct credits
      await this.creditsService.deductCredits(
        userId,
        actualCost,
        'AI content generation',
        {
          prompt: prompt.substring(0, 200),
          model,
          tokensUsed: actualTokens,
          creditsCharged: actualCost,
        },
      );

      return {
        message: 'Content generated successfully',
        data: {
          generatedText,
          creditsUsed: actualCost,
          tokensUsed: actualTokens,
          remainingCredits: balance.availableCredits - actualCost,
        },
      };
    } catch (error) {
      // If generation failed, don't deduct credits
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message: `Failed to generate content: ${errorMessage}`,
      });
    }
  }

  estimateCost(prompt: string, maxTokens = 500): CostEstimation {
    const estimatedTokens = Math.ceil(prompt.length / 4) + maxTokens;
    const estimatedCost = Math.ceil(estimatedTokens * this.creditCostPerToken);

    return {
      estimatedTokens,
      estimatedCost,
      costPerToken: this.creditCostPerToken,
    };
  }
}
