import { ApiProperty } from '@nestjs/swagger';

export class CreditBalanceResponseDto {
  @ApiProperty({
    description: 'Total credits ever purchased',
    example: 500,
  })
  totalCredits: number;

  @ApiProperty({
    description: 'Total credits used',
    example: 150,
  })
  usedCredits: number;

  @ApiProperty({
    description: 'Currently available credits',
    example: 300,
  })
  availableCredits: number;

  @ApiProperty({
    description: 'Credits that have expired',
    example: 50,
  })
  expiredCredits: number;

  @ApiProperty({
    description: 'Credits expiring in the next 7 days',
    example: 20,
  })
  creditsExpiringSoon: number;
}
