import { IsUUID, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustCreditsDto {
  @ApiProperty({
    description: 'User ID to adjust credits for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Amount to adjust (positive to add, negative to subtract)',
    example: 100,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Reason for adjustment',
    example: 'Manual credit adjustment by admin',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { reason: 'compensation', ticket_id: '12345' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
