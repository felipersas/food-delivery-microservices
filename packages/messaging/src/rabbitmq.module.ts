import amqp from 'amqp-connection-manager';
import type { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import type { Channel, ConsumeMessage } from 'amqplib';
import type { DomainEvent } from '@app/shared';

export interface RabbitMQConfig {
  url: string;
  exchange: string;
}

export class RabbitMQConnection {
  private connection: AmqpConnectionManager;
  private channel: ChannelWrapper;
  private exchange: string;

  constructor(config: RabbitMQConfig) {
    this.exchange = config.exchange;
    this.connection = amqp.connect([config.url]);
    this.channel = this.connection.createChannel({
      json: true,
      setup: async (ch: Channel) => {
        await ch.assertExchange(this.exchange, 'topic', { durable: true });
      },
    });
  }

  async publish(routingKey: string, event: DomainEvent): Promise<void> {
    this.channel.publish(this.exchange, routingKey, event);
  }

  async subscribe(
    queue: string,
    routingKeys: string[],
    handler: (event: DomainEvent) => Promise<void>,
  ): Promise<void> {
    await this.channel.addSetup(async (ch: Channel) => {
      await ch.assertQueue(queue, { durable: true });

      for (const key of routingKeys) {
        await ch.bindQueue(queue, this.exchange, key);
      }

      await ch.consume(queue, async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString()) as DomainEvent;
          await handler(event);
          ch.ack(msg);
        } catch (err) {
          ch.nack(msg, false, false);
        }
      });
    });
  }

  async close(): Promise<void> {
    await this.channel.close();
    await this.connection.close();
  }

  isConnected(): boolean {
    return this.connection.isConnected();
  }
}
