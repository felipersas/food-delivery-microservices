import * as amqp from 'amqplib';
import { RabbitMQTestContainer } from '../containers/rabbitmq-container';

export interface AwaitEventOptions {
  exchange?: string;
  routingKey?: string;
  timeout?: number;
  count?: number;
}

export async function awaitEvent(
  eventType: string,
  options: AwaitEventOptions = {}
): Promise<any[]> {
  const {
    exchange = 'test-exchange',
    routingKey = '#',
    timeout = 5000,
    count = 1,
  } = options;

  const events: any[] = [];
  let resolve: (() => void) | null = null;
  let timeoutHandle: NodeJS.Timeout | null = null;

  const promise = new Promise<void>((_resolve) => {
    resolve = _resolve;
  });

  const cleanup = async () => {
    try {
      await RabbitMQTestContainer.cancel(consumerTag);
    } catch {
      // Already cleaned up
    }
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  };

  timeoutHandle = setTimeout(() => {
    cleanup();
    if (resolve) resolve();
  }, timeout);

  const conn = await RabbitMQTestContainer.getConnection();
  const channel = await conn.createChannel();

  const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
  await channel.bindQueue(queue, exchange, routingKey);

  const consumerTag = await channel.consume(queue, (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());

      if (content.eventType === eventType || content.type === eventType) {
        events.push(content);
        channel.ack(msg);

        if (events.length >= count!) {
          cleanup();
          if (resolve) resolve();
        }
      } else {
        channel.nack(msg, false, true);
      }
    } catch (err) {
      console.error('[awaitEvent] Failed to parse message:', err);
      channel.nack(msg, false, false);
    }
  });

  await promise;

  await channel.deleteQueue(queue);
  await channel.close();

  return events;
}
