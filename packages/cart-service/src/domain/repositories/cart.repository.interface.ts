import type { Repository } from '@app/shared';
import { Cart } from '../aggregates/cart.aggregate';

export interface CartRepository extends Repository<Cart> {
  findActiveByCustomerId(customerId: string): Promise<Cart | null>;
  findAllActive(): Promise<Cart[]>;
}
