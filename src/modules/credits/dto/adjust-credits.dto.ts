import { IsUUID, IsNumber, IsString, IsOptional } from 'class-validator';

export class AdjustCreditsDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
