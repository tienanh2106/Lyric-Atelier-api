import { ApiProperty } from '@nestjs/swagger';
import { CreditLedger } from '../entities/credit-ledger.entity';

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

export class PaginatedLedgerResponseDto {
  @ApiProperty({
    description: 'List of credit ledger entries',
    type: [CreditLedger],
  })
  data: CreditLedger[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
