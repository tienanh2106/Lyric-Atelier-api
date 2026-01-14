import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { CreditsSchedulerService } from './credits-scheduler.service';
import { CreditPackage } from './entities/credit-package.entity';
import { CreditLedger } from './entities/credit-ledger.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { UserCreditSummary } from '../users/entities/user-credit-summary.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditPackage,
      CreditLedger,
      CreditTransaction,
      UserCreditSummary,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [CreditsController],
  providers: [CreditsService, CreditsSchedulerService],
  exports: [CreditsService],
})
export class CreditsModule {}
