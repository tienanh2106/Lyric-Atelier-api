import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CreditsService } from '../credits/credits.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { SuggestScenarioDto, ScenarioType } from './dto/suggest-scenario.dto';
import { MediaToTextDto } from './dto/media-to-text.dto';
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

  async suggestScenario(
    userId: string,
    suggestDto: SuggestScenarioDto,
  ): Promise<GenerationResult> {
    const {
      prompt,
      scenarioType = ScenarioType.GENERAL,
      numberOfSuggestions = 3,
    } = suggestDto;

    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_PROMPT,
        message: 'Prompt cannot be empty',
      });
    }

    // Build system prompt based on scenario type
    let systemPrompt = '';
    switch (scenarioType) {
      case ScenarioType.MUSIC_LYRICS:
        systemPrompt = `You are an expert music composer and lyricist. Please suggest ${numberOfSuggestions} detailed scenarios/ideas for writing song lyrics based on the following request: "${prompt}".
Each suggestion should include:
- Main theme
- Mood/emotion
- Music style
- Structure ideas (verse, chorus, bridge)
- Some suggested imagery/metaphors`;
        break;
      case ScenarioType.STORY_WRITING:
        systemPrompt = `You are a professional writer. Please suggest ${numberOfSuggestions} detailed story scenarios based on the request: "${prompt}".
Each scenario should include:
- Main premise
- Main characters and their roles
- Conflict/problem
- Setting
- Story development direction`;
        break;
      case ScenarioType.MARKETING:
        systemPrompt = `You are a creative marketing expert. Please suggest ${numberOfSuggestions} marketing scenarios/strategies based on the request: "${prompt}".
Each scenario should include:
- Campaign idea
- Target audience
- Key message
- Communication channels
- Specific content suggestions`;
        break;
      case ScenarioType.CREATIVE_WRITING:
        systemPrompt = `You are a versatile content creator. Please suggest ${numberOfSuggestions} creative ideas based on the request: "${prompt}".
Each idea should be detailed and highly practical.`;
        break;
      default:
        systemPrompt = `Please suggest ${numberOfSuggestions} detailed and creative scenarios/ideas based on the following request: "${prompt}".
Each suggestion should be specific, easy to implement, and highly creative.`;
    }

    const fullPrompt = `${systemPrompt}\n\nPlease respond in Vietnamese, clearly formatted with suggestions numbered from 1 to ${numberOfSuggestions}.`;

    // Estimate credit cost
    const estimatedTokens = Math.ceil(fullPrompt.length / 4) + 1000; // Estimate longer response
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

    try {
      const genModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await genModel.generateContent(fullPrompt);
      const response = result.response;
      const generatedText = response.text();

      // Calculate actual cost
      const actualTokens = Math.ceil(
        (fullPrompt.length + generatedText.length) / 4,
      );
      const actualCost = Math.ceil(actualTokens * this.creditCostPerToken);

      // Deduct credits
      await this.creditsService.deductCredits(
        userId,
        actualCost,
        'AI scenario suggestion',
        {
          scenarioType,
          prompt: prompt.substring(0, 200),
          tokensUsed: actualTokens,
          creditsCharged: actualCost,
        },
      );

      return {
        message: 'Scenarios suggested successfully',
        data: {
          generatedText,
          creditsUsed: actualCost,
          tokensUsed: actualTokens,
          remainingCredits: balance.availableCredits - actualCost,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message: `Failed to suggest scenarios: ${errorMessage}`,
      });
    }
  }

  async mediaToText(
    userId: string,
    mediaDto: MediaToTextDto,
  ): Promise<GenerationResult> {
    const {
      mediaUrl,
      mediaType,
      prompt = 'Transcribe this media file to text',
      language = 'vi',
      model = 'gemini-pro',
    } = mediaDto;

    if (!mediaUrl || mediaUrl.trim().length === 0) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_PROMPT,
        message: 'Media URL cannot be empty',
      });
    }

    // Build full prompt with instructions
    const fullPrompt = `${prompt}

Media type: ${mediaType}
Language: ${language}

Please transcribe the ${mediaType} content accurately. If this is a song, format the output as lyrics. If it's dialogue, format it with speaker labels if identifiable. Provide the transcription in ${language === 'vi' ? 'Vietnamese' : language}.`;

    // Estimate credit cost (media processing typically uses more tokens)
    const estimatedTokens = 2000; // Base estimate for media processing
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

    try {
      // For media processing, we'll use the multimodal capabilities
      // Note: This is a simplified implementation
      // In production, you might need to download the media first or use specialized API
      const genModel = this.genAI.getGenerativeModel({ model });

      // Create a prompt that includes the media URL
      const mediaPrompt = `${fullPrompt}\n\nMedia URL: ${mediaUrl}\n\nNote: Please access and transcribe the media from the provided URL.`;

      const result = await genModel.generateContent(mediaPrompt);
      const response = result.response;
      const generatedText = response.text();

      // Calculate actual cost
      const actualTokens = Math.ceil(
        (mediaPrompt.length + generatedText.length) / 4,
      );
      const actualCost = Math.ceil(actualTokens * this.creditCostPerToken);

      // Deduct credits
      await this.creditsService.deductCredits(
        userId,
        actualCost,
        'AI media to text conversion',
        {
          mediaType,
          mediaUrl: mediaUrl.substring(0, 100),
          language,
          tokensUsed: actualTokens,
          creditsCharged: actualCost,
        },
      );

      return {
        message: 'Media transcribed successfully',
        data: {
          generatedText,
          creditsUsed: actualCost,
          tokensUsed: actualTokens,
          remainingCredits: balance.availableCredits - actualCost,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException({
        errorCode: ErrorCode.GENERATION_FAILED,
        message: `Failed to transcribe media: ${errorMessage}`,
      });
    }
  }
}
