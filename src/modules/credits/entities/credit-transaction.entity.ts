import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { CreditPackage } from './credit-package.entity';

@Entity('credit_transactions')
export class CreditTransaction {
  @ApiProperty({
    description: 'Transaction unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User who made the purchase',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({
    description: 'Credit package purchased',
    type: () => CreditPackage,
  })
  @ManyToOne(() => CreditPackage)
  package: CreditPackage;

  @ApiProperty({
    description: 'Number of credits purchased',
    example: 100,
  })
  @Column({ type: 'int' })
  creditsPurchased: number;

  @ApiProperty({
    description: 'Transaction amount in USD',
    example: 9.99,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({
    description: 'Transaction status',
    example: 'completed',
  })
  @Column({ default: 'completed' })
  status: string;

  @ApiProperty({
    description: 'Payment method used',
    example: 'credit_card',
    required: false,
  })
  @Column({ nullable: true })
  paymentMethod: string;

  @ApiProperty({
    description: 'Payment gateway transaction ID',
    example: 'txn_1234567890',
    required: false,
  })
  @Column({ nullable: true })
  paymentTransactionId: string;

  @ApiProperty({
    description: 'Purchase timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn()
  purchaseDate: Date;

  @ApiProperty({
    description: 'Credits expiration timestamp',
    example: '2024-04-15T10:30:00Z',
  })
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty({
    description: 'Additional transaction metadata',
    example: { gateway: 'stripe', receipt_url: 'https://...' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
