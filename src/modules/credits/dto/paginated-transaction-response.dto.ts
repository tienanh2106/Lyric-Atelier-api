import { ApiProperty } from '@nestjs/swagger';
import { CreditTransaction } from '../entities/credit-transaction.entity';

class PaginationMeta {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}

export class PaginatedTransactionResponseDto {
  @ApiProperty({
    description: 'List of credit transactions',
    type: [CreditTransaction],
  })
  data: CreditTransaction[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
