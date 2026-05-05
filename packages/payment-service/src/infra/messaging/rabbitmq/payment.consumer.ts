import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { v4 as uuidv4 } from 'uuid';
import { RABBITMQ_CONNECTION } from '../../../tokens';

@Injectable()
export class PaymentConsumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    private readonly processPayment: ProcessPaymentUseCase,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'payment-service-orders',
      ['order.created'],
      async (event: DomainEvent) => {
        const data = event.data as any;

        // Determine payment method: use saved method index or fall back to order's payment method type
        let paymentMethod = 'PIX'; // Default fallback
        let customerId = data.customerId;
        let paymentMethodIndex = data.paymentMethodIndex;

        if (data.paymentMethodType) {
          paymentMethod = data.paymentMethodType;
        } else if (paymentMethodIndex !== undefined && customerId) {
          // TODO: Fetch customer's saved payment method from customer service
          // For now, use PIX as default
          paymentMethod = 'PIX';
        }

        const result = await this.processPayment.execute({
          orderId: data.orderId,
          amount: data.totalAmount,
          method: paymentMethod,
          customerId,
          paymentMethodIndex,
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
            method: paymentMethod,
            restaurantId: data.restaurantId,
            items: data.items,
            customerId,
          },
        };

        await this.connection.publish(paymentEvent.eventType, paymentEvent);
      },
    );
  }
}
