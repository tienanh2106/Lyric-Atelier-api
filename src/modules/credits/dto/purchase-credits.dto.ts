import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseCreditsDto {
  @ApiProperty({
    description: 'Credit package ID to purchase',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  packageId: string;

  @ApiPropertyOptional({
    description: 'Payment method used',
    example: 'credit_card',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'External payment transaction ID',
    example: 'txn_123456789',
  })
  @IsOptional()
  @IsString()
  paymentTransactionId?: string;
}
