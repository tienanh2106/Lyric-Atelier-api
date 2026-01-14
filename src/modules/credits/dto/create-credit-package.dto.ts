import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreditPackageDto {
  @ApiProperty({
    description: 'Package name',
    example: 'Starter Pack',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Number of credits in the package',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  credits: number;

  @ApiProperty({
    description: 'Package price in USD',
    example: 9.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Validity period in days',
    example: 90,
    minimum: 1,
    default: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  validityDays?: number;

  @ApiPropertyOptional({
    description: 'Package description',
    example: 'Perfect for beginners',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the package is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
