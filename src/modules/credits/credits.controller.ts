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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Credits')
@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  // Package Management (Admin)
  @Post('packages')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create credit package (Admin only)' })
  @ApiResponse({ status: 201, description: 'Package created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  createPackage(@Body() createPackageDto: CreateCreditPackageDto) {
    return this.creditsService.createPackage(createPackageDto);
  }

  @Get('packages')
  @Public()
  @ApiOperation({ summary: 'Get all active credit packages' })
  @ApiResponse({ status: 200, description: 'List of credit packages' })
  findAllPackages() {
    return this.creditsService.findAllPackages();
  }

  @Get('packages/:id')
  @Public()
  @ApiOperation({ summary: 'Get credit package by ID' })
  @ApiResponse({ status: 200, description: 'Credit package details' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  findPackage(@Param('id') id: string) {
    return this.creditsService.findPackage(id);
  }

  @Patch('packages/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update credit package (Admin only)' })
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
  @ApiOperation({ summary: 'Delete credit package (Admin only)' })
  @ApiResponse({ status: 200, description: 'Package deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  deletePackage(@Param('id') id: string) {
    return this.creditsService.deletePackage(id);
  }

  // User Operations
  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase credits' })
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
  @ApiOperation({ summary: 'Get credit balance' })
  @ApiResponse({ status: 200, description: 'Credit balance retrieved' })
  getCreditBalance(@CurrentUser() user: User) {
    return this.creditsService.getCreditBalance(user.id);
  }

  @Get('ledger')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit ledger history' })
  @ApiResponse({ status: 200, description: 'Ledger history retrieved' })
  getLedgerHistory(
    @CurrentUser() user: User,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.creditsService.getLedgerHistory(user.id, paginationDto);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get credit transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved' })
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
  @ApiOperation({ summary: 'Adjust user credits (Admin only)' })
  @ApiResponse({ status: 200, description: 'Credits adjusted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  adjustCredits(@Body() adjustDto: AdjustCreditsDto) {
    return this.creditsService.adjustCredits(adjustDto);
  }
}
