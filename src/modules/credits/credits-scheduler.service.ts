import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreditsService } from './credits.service';

@Injectable()
export class CreditsSchedulerService {
  private readonly logger = new Logger(CreditsSchedulerService.name);

  constructor(private readonly creditsService: CreditsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCreditExpiration() {
    this.logger.log('Running credit expiration job...');

    try {
      await this.creditsService.expireCredits();
      this.logger.log('Credit expiration job completed successfully');
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error running credit expiration job', stack);
    }
  }
}
