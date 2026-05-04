import type { Repository } from '@app/shared';
import type { Payment } from '@domain/aggregates/payment.aggregate';

export type PaymentRepository = Repository<Payment>;
