import { IsUUID, IsOptional, IsString } from 'class-validator';

export class PurchaseCreditsDto {
  @IsUUID()
  packageId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentTransactionId?: string;
}
