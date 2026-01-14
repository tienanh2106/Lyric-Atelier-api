import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { CreditTransaction } from './credit-transaction.entity';

@Entity('credit_packages')
export class CreditPackage {
  @ApiProperty({
    description: 'Package unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Package name',
    example: 'Starter Pack',
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Number of credits in the package',
    example: 100,
  })
  @Column({ type: 'int' })
  credits: number;

  @ApiProperty({
    description: 'Package price in USD',
    example: 9.99,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ApiProperty({
    description: 'Validity period in days',
    example: 90,
  })
  @Column({ type: 'int', default: 90 })
  validityDays: number;

  @ApiProperty({
    description: 'Package availability status',
    example: true,
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Package description',
    example: 'Perfect for beginners',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Package creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => CreditTransaction, (transaction) => transaction.package)
  transactions: CreditTransaction[];
}
