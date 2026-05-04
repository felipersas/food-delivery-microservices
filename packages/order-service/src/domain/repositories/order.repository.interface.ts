import type { Repository } from '@app/shared';
import type { Order } from '../aggregates/order.aggregate';

export type OrderRepository = Repository<Order>;
