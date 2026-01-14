import { Module } from '@nestjs/common';
import { GenAIService } from './genai.service';
import { GenAIController } from './genai.controller';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [CreditsModule],
  controllers: [GenAIController],
  providers: [GenAIService],
  exports: [GenAIService],
})
export class GenAIModule {}
