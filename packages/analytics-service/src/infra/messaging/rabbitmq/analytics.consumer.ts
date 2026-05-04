import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';

@Injectable()
export class AnalyticsConsumer {
  private totalOrders = 0;
  private totalRevenue = 0;
  private ordersByStatus: Record<string, number> = {};

  constructor(@Inject('RabbitMQConnection') private readonly connection: RabbitMQConnection) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'analytics-service-events',
      ['order.#', 'payment.#'],
      async (event: DomainEvent) => {
        const data = event.data as any;
        switch (event.eventType) {
          case 'order.created':
            this.totalOrders++;
            this.totalRevenue += data.totalAmount ?? 0;
            this.ordersByStatus['CREATED'] = (this.ordersByStatus['CREATED'] ?? 0) + 1;
            break;
          case 'payment.confirmed':
            this.ordersByStatus['PAID'] = (this.ordersByStatus['PAID'] ?? 0) + 1;
            break;
          case 'order.ready':
            this.ordersByStatus['READY'] = (this.ordersByStatus['READY'] ?? 0) + 1;
            break;
        }
      },
    );
  }

  getMetrics() {
    return {
      totalOrders: this.totalOrders,
      totalRevenue: this.totalRevenue,
      averageOrderValue: this.totalOrders > 0 ? this.totalRevenue / this.totalOrders : 0,
      ordersByStatus: { ...this.ordersByStatus },
    };
  }
}
