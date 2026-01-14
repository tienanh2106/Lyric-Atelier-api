import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_credit_summary')
export class UserCreditSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCredits: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  usedCredits: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  availableCredits: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  expiredCredits: number;

  @UpdateDateColumn()
  lastUpdated: Date;
}
