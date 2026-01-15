import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreditsService } from './credits.service';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { PurchaseCreditsDto } from './dto/purchase-credits.dto';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreditBalanceResponseDto } from './dto/credit-balance-response.dto';
import { PaginatedLedgerResponseDto } from './dto/paginated-ledger-response.dto';
import { PaginatedTransactionResponseDto } from './dto/paginated-transaction-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { CreditPackage } from './entities/credit-package.entity';

@ApiTags('Credits')
@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // Package Management (Admin)
  @Post('packages')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'createCreditPackage',
    summary: 'Create credit package',
    description: 'Admin only',
  })
  @ApiResponse({
    status: 201,
    description: 'Package created successfully',
    type: CreditPackage,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  createPackage(@Body() createPackageDto: CreateCreditPackageDto) {
    return this.creditsService.createPackage(createPackageDto);
  }

  @Get('packages')
  @Public()
  @ApiOperation({
    operationId: 'getCreditPackages',
    summary: 'Get all active credit packages',
    description: 'Public endpoint - no authentication required',
  })
  @ApiResponse({
    status: 200,
    description: 'List of credit packages',
    type: [CreditPackage],
  })
  findAllPackages() {
    return this.creditsService.findAllPackages();
  }

  @Get('packages/:id')
  @Public()
  @ApiOperation({
    operationId: 'getCreditPackage',
    summary: 'Get credit package by ID',
    description: 'Public endpoint - no authentication required',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit package details',
    type: CreditPackage,
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  findPackage(@Param('id') id: string) {
    return this.creditsService.findPackage(id);
  }

  @Patch('packages/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'updateCreditPackage',
    summary: 'Update credit package (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Package updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  updatePackage(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCreditPackageDto>,
  ) {
    return this.creditsService.updatePackage(id, updateData);
  }

  @Delete('packages/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'deleteCreditPackage',
    summary: 'Delete credit package (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  deletePackage(@Param('id') id: string) {
    return this.creditsService.deletePackage(id);
  }

  // User Operations
  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'purchaseCredits',
    summary: 'Purchase credits',
  })
  @ApiResponse({ status: 201, description: 'Credits purchased successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  purchaseCredits(
    @CurrentUser() user: User,
    @Body() purchaseDto: PurchaseCreditsDto,
  ) {
    return this.creditsService.purchaseCredits(user.id, purchaseDto);
  }

  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'getCreditBalance',
    summary: 'Get credit balance',
    description: 'Get current credit balance and summary',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit balance retrieved',
    type: CreditBalanceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCreditBalance(@CurrentUser() user: User) {
    return this.creditsService.getCreditBalance(user.id);
  }

  @Get('ledger')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'getCreditLedger',
    summary: 'Get credit ledger history',
    description: 'Get paginated credit ledger entries (audit trail)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ledger history retrieved',
    type: PaginatedLedgerResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLedgerHistory(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.creditsService.getLedgerHistory(user.id, paginationDto);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'getCreditTransactions',
    summary: 'Get credit transaction history',
    description: 'Get paginated credit purchase transactions',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved',
    type: PaginatedTransactionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTransactionHistory(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.creditsService.getTransactionHistory(user.id, paginationDto);
  }

  // Admin Operations
  @Post('admin/adjust')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    operationId: 'adjustCredits',
    summary: 'Adjust user credits (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Credits adjusted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  adjustCredits(@Body() adjustDto: AdjustCreditsDto) {
    return this.creditsService.adjustCredits(adjustDto);
  }
}
