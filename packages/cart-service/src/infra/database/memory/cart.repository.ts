import { Injectable } from '@nestjs/common';
import type { CartRepository } from '../../../domain/repositories/cart.repository.interface';
import { Cart } from '../../../domain/aggregates/cart.aggregate';

@Injectable()
export class InMemoryCartRepository implements CartRepository {
  private carts: Map<string, Cart> = new Map();

  async findById(id: string): Promise<Cart | null> {
    return this.carts.get(id) ?? null;
  }

  async save(aggregate: Cart): Promise<void> {
    this.carts.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.carts.delete(id);
  }

  async findActiveByCustomerId(customerId: string): Promise<Cart | null> {
    for (const cart of this.carts.values()) {
      if (cart.getCustomerId() === customerId && cart.isActive()) {
        return cart;
      }
    }
    return null;
  }

  async findAllActive(): Promise<Cart[]> {
    return Array.from(this.carts.values()).filter((cart) => cart.isActive());
  }
}
