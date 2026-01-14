import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { CreditTransactionType } from '../../../common/enums/credit-transaction-type.enum';

@Entity('credit_ledger')
@Index(['user', 'expiresAt'])
export class CreditLedger {
  @ApiProperty({
    description: 'Ledger entry unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'User associated with this ledger entry',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({
    description: 'Transaction type',
    enum: CreditTransactionType,
    example: CreditTransactionType.PURCHASE,
  })
  @Column({
    type: 'enum',
    enum: CreditTransactionType,
  })
  type: CreditTransactionType;

  @ApiProperty({
    description: 'Credits deducted',
    example: 10.5,
  })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit: number;

  @ApiProperty({
    description: 'Credits added',
    example: 100.0,
  })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit: number;

  @ApiProperty({
    description: 'Balance after this transaction',
    example: 89.5,
  })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balance: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'AI generation usage',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { model: 'gemini-pro', tokens: 1500 },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Reference ID to related transaction',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @Column({ nullable: true })
  referenceId: string;

  @ApiProperty({
    description: 'Entry creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Credit expiration timestamp',
    example: '2024-04-15T10:30:00Z',
    required: false,
  })
  @Index()
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @ApiProperty({
    description: 'Whether credits have expired',
    example: false,
  })
  @Column({ default: false })
  isExpired: boolean;
}
