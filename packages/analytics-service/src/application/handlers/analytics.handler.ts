import type { DomainEvent } from '@app/shared';

export interface OrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
}

export class AnalyticsHandler {
  private totalOrders = 0;
  private totalRevenue = 0;
  private ordersByStatus: Record<string, number> = {};

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'order.created':
        this.totalOrders++;
        this.totalRevenue += ((event.data as any).totalAmountCents ?? 0) / 100; // Convert cents to decimal
        this.ordersByStatus['CREATED'] = (this.ordersByStatus['CREATED'] ?? 0) + 1;
        break;
      case 'payment.confirmed':
        this.ordersByStatus['PAID'] = (this.ordersByStatus['PAID'] ?? 0) + 1;
        break;
      case 'order.ready':
        this.ordersByStatus['READY'] = (this.ordersByStatus['READY'] ?? 0) + 1;
        break;
    }
  }

  getMetrics(): OrderMetrics {
    return {
      totalOrders: this.totalOrders,
      totalRevenue: this.totalRevenue,
      averageOrderValue: this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0,
      ordersByStatus: { ...this.ordersByStatus },
    };
  }
}
