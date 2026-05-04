import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentConsumer {
  private processPayment: ProcessPaymentUseCase;

  constructor(@Inject('RabbitMQConnection') private readonly connection: RabbitMQConnection) {
    this.processPayment = new ProcessPaymentUseCase();
  }

  async start(): Promise<void> {
    await this.connection.subscribe(
      'payment-service-orders',
      ['order.created'],
      async (event: DomainEvent) => {
        const data = event.data as any;

        const result = await this.processPayment.execute({
          orderId: data.orderId,
          amount: data.totalAmount,
          method: 'PIX',
        });

        const paymentEvent: DomainEvent = {
          eventId: uuidv4(),
          eventType: result.status === 'CONFIRMED' ? 'payment.confirmed' : 'payment.rejected',
          occurredAt: new Date().toISOString(),
          aggregateId: result.paymentId,
          aggregateType: 'Payment',
          data: {
            orderId: data.orderId,
            paymentId: result.paymentId,
            amount: data.totalAmount,
            method: 'PIX',
          },
        };

        await this.connection.publish(paymentEvent.eventType, paymentEvent);
      },
    );
  }
}
