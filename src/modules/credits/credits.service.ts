import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CreditPackage } from './entities/credit-package.entity';
import { CreditLedger } from './entities/credit-ledger.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { UserCreditSummary } from '../users/entities/user-credit-summary.entity';
import { CreateCreditPackageDto } from './dto/create-credit-package.dto';
import { PurchaseCreditsDto } from './dto/purchase-credits.dto';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreditTransactionType } from '../../common/enums/credit-transaction-type.enum';
import { ErrorCode } from '../../common/enums/error-code.enum';

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(CreditPackage)
    private readonly packageRepository: Repository<CreditPackage>,
    @InjectRepository(CreditLedger)
    private readonly ledgerRepository: Repository<CreditLedger>,
    @InjectRepository(CreditTransaction)
    private readonly transactionRepository: Repository<CreditTransaction>,
    @InjectRepository(UserCreditSummary)
    private readonly summaryRepository: Repository<UserCreditSummary>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // Package Management
  async createPackage(
    createPackageDto: CreateCreditPackageDto,
  ): Promise<CreditPackage> {
    const creditPackage = this.packageRepository.create(createPackageDto);
    return this.packageRepository.save(creditPackage);
  }

  async findAllPackages(): Promise<CreditPackage[]> {
    return this.packageRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async findPackage(id: string): Promise<CreditPackage> {
    const creditPackage = await this.packageRepository.findOne({
      where: { id },
    });

    if (!creditPackage) {
      throw new NotFoundException({
        errorCode: ErrorCode.PACKAGE_NOT_FOUND,
        message: 'Credit package not found',
      });
    }

    return creditPackage;
  }

  async updatePackage(
    id: string,
    updateData: Partial<CreateCreditPackageDto>,
  ): Promise<CreditPackage> {
    const creditPackage = await this.findPackage(id);
    Object.assign(creditPackage, updateData);
    return this.packageRepository.save(creditPackage);
  }

  async deletePackage(id: string): Promise<void> {
    const creditPackage = await this.findPackage(id);
    await this.packageRepository.remove(creditPackage);
  }

  // Purchase Credits
  async purchaseCredits(
    userId: string,
    purchaseDto: PurchaseCreditsDto,
  ): Promise<{
    message: string;
    data: {
      transaction: CreditTransaction;
      creditsAdded: number;
      newBalance: number;
      expiresAt: Date;
    };
  }> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get package details
      const creditPackage = await manager.findOne(CreditPackage, {
        where: { id: purchaseDto.packageId, isActive: true },
      });

      if (!creditPackage) {
        throw new NotFoundException({
          errorCode: ErrorCode.PACKAGE_NOT_FOUND,
          message: 'Credit package not found or inactive',
        });
      }

      // 2. Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + creditPackage.validityDays);

      // 3. Create credit transaction record
      const transaction = manager.create(CreditTransaction, {
        user: { id: userId },
        package: creditPackage,
        creditsPurchased: creditPackage.credits,
        amount: creditPackage.price,
        status: 'completed',
        paymentMethod: purchaseDto.paymentMethod || 'manual',
        paymentTransactionId: purchaseDto.paymentTransactionId,
        expiresAt,
      });
      const savedTransaction = await manager.save(transaction);

      // 4. Get or create user credit summary
      let summary = await manager.findOne(UserCreditSummary, {
        where: { user: { id: userId } },
      });

      if (!summary) {
        summary = manager.create(UserCreditSummary, {
          user: { id: userId },
          totalCredits: 0,
          usedCredits: 0,
          availableCredits: 0,
          expiredCredits: 0,
        });
      }

      const newBalance =
        parseFloat(summary.availableCredits.toString()) + creditPackage.credits;

      // 5. Create ledger entry
      const ledger = manager.create(CreditLedger, {
        user: { id: userId },
        type: CreditTransactionType.PURCHASE,
        debit: creditPackage.credits,
        credit: 0,
        balance: newBalance,
        description: `Purchased ${creditPackage.name} package`,
        metadata: {
          packageId: creditPackage.id,
          packageName: creditPackage.name,
          transactionId: savedTransaction.id,
        },
        referenceId: savedTransaction.id,
        expiresAt,
        isExpired: false,
      });
      await manager.save(ledger);

      // 6. Update summary
      summary.totalCredits =
        Number.parseFloat(summary.totalCredits.toString()) +
        creditPackage.credits;
      summary.availableCredits = newBalance;
      await manager.save(summary);

      return {
        message: 'Credits purchased successfully',
        data: {
          transaction: savedTransaction,
          creditsAdded: creditPackage.credits,
          newBalance,
          expiresAt,
        },
      };
    });
  }

  // Deduct Credits (FIFO)
  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (amount <= 0) {
      throw new BadRequestException({
        errorCode: ErrorCode.INVALID_CREDIT_AMOUNT,
        message: 'Credit amount must be greater than 0',
      });
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Get user's credit summary with lock
      const summary = await manager.findOne(UserCreditSummary, {
        where: { user: { id: userId } },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        !summary ||
        Number.parseFloat(summary.availableCredits.toString()) < amount
      ) {
        throw new BadRequestException({
          errorCode: ErrorCode.INSUFFICIENT_CREDITS,
          message: `Insufficient credits. Available: ${summary?.availableCredits ?? 0}, Required: ${amount}`,
        });
      }

      // 2. Get non-expired credit ledger entries (FIFO)
      const ledgerEntries = await manager.find(CreditLedger, {
        where: {
          user: { id: userId },
          isExpired: false,
          debit: MoreThan(0),
        },
        order: { expiresAt: 'ASC', createdAt: 'ASC' },
      });

      let remainingAmount = amount;
      const usedLedgerIds: string[] = [];

      // 3. Deduct from oldest credits first
      for (const entry of ledgerEntries) {
        if (remainingAmount <= 0) break;

        const availableInEntry =
          Number.parseFloat(entry.debit.toString()) -
          Number.parseFloat(entry.credit.toString());
        if (availableInEntry <= 0) continue;

        const deductFromEntry = Math.min(availableInEntry, remainingAmount);

        // Update entry
        entry.credit =
          Number.parseFloat(entry.credit.toString()) + deductFromEntry;
        await manager.save(entry);

        remainingAmount -= deductFromEntry;
        usedLedgerIds.push(entry.id);
      }

      // 4. Create usage ledger entry
      const newBalance =
        Number.parseFloat(summary.availableCredits.toString()) - amount;
      const ledger = manager.create(CreditLedger, {
        user: { id: userId },
        type: CreditTransactionType.USAGE,
        debit: 0,
        credit: amount,
        balance: newBalance,
        description,
        metadata: {
          ...metadata,
          usedLedgerIds,
        },
      });
      await manager.save(ledger);

      // 5. Update summary
      summary.usedCredits =
        Number.parseFloat(summary.usedCredits.toString()) + amount;
      summary.availableCredits = newBalance;
      await manager.save(summary);
    });
  }

  // Get Credit Balance
  async getCreditBalance(userId: string): Promise<{
    totalCredits: number;
    usedCredits: number;
    availableCredits: number;
    expiredCredits: number;
    creditsExpiringSoon: number;
  }> {
    const summary = await this.summaryRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!summary) {
      return {
        totalCredits: 0,
        usedCredits: 0,
        availableCredits: 0,
        expiredCredits: 0,
        creditsExpiringSoon: 0,
      };
    }

    // Get credits expiring soon (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringSoon = await this.ledgerRepository
      .createQueryBuilder('ledger')
      .where('ledger.userId = :userId', { userId })
      .andWhere('ledger.isExpired = :isExpired', { isExpired: false })
      .andWhere('ledger.expiresAt <= :expiresAt', {
        expiresAt: sevenDaysFromNow,
      })
      .andWhere('ledger.debit > ledger.credit')
      .select('SUM(ledger.debit - ledger.credit)', 'creditsExpiringSoon')
      .getRawOne<{ creditsExpiringSoon: string }>();

    return {
      totalCredits: Number.parseFloat(summary.totalCredits.toString()),
      usedCredits: Number.parseFloat(summary.usedCredits.toString()),
      availableCredits: Number.parseFloat(summary.availableCredits.toString()),
      expiredCredits: Number.parseFloat(summary.expiredCredits.toString()),
      creditsExpiringSoon: Number.parseFloat(
        expiringSoon?.creditsExpiringSoon ?? '0',
      ),
    };
  }

  // Get Ledger History
  async getLedgerHistory(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<{
    data: CreditLedger[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [ledgers, total] = await this.ledgerRepository.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: ledgers,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get Transaction History
  async getTransactionHistory(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<{
    data: CreditTransaction[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: { user: { id: userId } },
        relations: ['package'],
        order: { purchaseDate: 'DESC' },
        skip,
        take: limit,
      },
    );

    return {
      data: transactions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Adjust Credits
  async adjustCredits(adjustDto: AdjustCreditsDto): Promise<{
    message: string;
    data: {
      adjustment: number;
      newBalance: number;
    };
  }> {
    return await this.dataSource.transaction(async (manager) => {
      const { userId, amount, description, metadata } = adjustDto;

      // Get or create summary
      let summary = await manager.findOne(UserCreditSummary, {
        where: { user: { id: userId } },
      });

      summary ??= manager.create(UserCreditSummary, {
        user: { id: userId },
        totalCredits: 0,
        usedCredits: 0,
        availableCredits: 0,
        expiredCredits: 0,
      });

      const newBalance =
        Number.parseFloat(summary.availableCredits.toString()) + amount;

      // Create ledger entry
      const ledger = manager.create(CreditLedger, {
        user: { id: userId },
        type: CreditTransactionType.ADMIN_ADJUSTMENT,
        debit: Math.max(amount, 0),
        credit: Math.max(-amount, 0),
        balance: newBalance,
        description,
        metadata,
      });
      await manager.save(ledger);

      // Update summary
      if (amount > 0) {
        summary.totalCredits =
          Number.parseFloat(summary.totalCredits.toString()) + amount;
      }
      summary.availableCredits = newBalance;
      await manager.save(summary);

      return {
        message: 'Credits adjusted successfully',
        data: {
          adjustment: amount,
          newBalance,
        },
      };
    });
  }

  // Expire Credits (Cron Job)
  async expireCredits(): Promise<void> {
    const now = new Date();

    const expiredEntries = await this.ledgerRepository.find({
      where: {
        isExpired: false,
        expiresAt: MoreThan(now),
      },
      relations: ['user'],
    });

    for (const entry of expiredEntries) {
      await this.dataSource.transaction(async (manager) => {
        const availableInEntry =
          Number.parseFloat(entry.debit.toString()) -
          Number.parseFloat(entry.credit.toString());

        if (availableInEntry <= 0) {
          entry.isExpired = true;
          await manager.save(entry);
          return;
        }

        // Get summary
        const summary = await manager.findOne(UserCreditSummary, {
          where: { user: { id: entry.user.id } },
        });

        if (summary) {
          const newBalance =
            Number.parseFloat(summary.availableCredits.toString()) -
            availableInEntry;

          // Create expiration ledger entry
          const ledger = manager.create(CreditLedger, {
            user: entry.user,
            type: CreditTransactionType.EXPIRATION,
            debit: 0,
            credit: availableInEntry,
            balance: newBalance,
            description: 'Credits expired',
            metadata: {
              expiredLedgerId: entry.id,
            },
            referenceId: entry.id,
          });
          await manager.save(ledger);

          // Update summary
          summary.expiredCredits =
            Number.parseFloat(summary.expiredCredits.toString()) +
            availableInEntry;
          summary.availableCredits = newBalance;
          await manager.save(summary);
        }

        // Mark as expired
        entry.isExpired = true;
        await manager.save(entry);
      });
    }
  }
}
