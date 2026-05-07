import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import type * as amqp from 'amqplib';

let amqplib: typeof amqp;
async function getAmqplib(): Promise<typeof amqp> {
  if (!amqplib) {
    amqplib = await import('amqplib');
  }
  return amqplib;
}

type MessageHandler = (msg: amqp.ConsumeMessage | null) => void;

export class RabbitMQTestContainer {
  private static instance?: StartedRabbitMQContainer;
  private static connection?: amqp.Connection;
  private static channels: Map<string, amqp.Channel> = new Map();
  private static consumers: Map<string, string> = new Map();

  static async start(): Promise<string> {
    if (this.instance) {
      return this.getAmqpUrl();
    }

    this.instance = await new RabbitMQContainer('rabbitmq:3.12-alpine')
      .withReuse()
      .start();

    return this.getAmqpUrl();
  }

  static getAmqpUrl(): string {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    const port = this.instance.getMappedPort(5672);
    return `amqp://guest:guest@${this.instance.getHost()}:${port}`;
  }

  static async getConnection(): Promise<amqp.Connection> {
    const lib = await getAmqplib();

    if (!this.connection) {
      const conn = await lib.connect(this.getAmqpUrl());
      this.connection = conn as any;

      (this.connection as any).on('close', () => {
        this.connection = undefined;
      });

      (this.connection as any).on('error', (err: Error) => {
        console.error('[RabbitMQTestContainer] Connection error:', err);
      });
    }

    return this.connection!;
  }

  static async getChannel(queueName: string): Promise<amqp.Channel> {
    if (!this.channels.has(queueName)) {
      const conn = await this.getConnection();
      const channel = await (conn as any).createChannel();

      await channel.assertQueue(queueName, { durable: true });
      await channel.prefetch(1);

      this.channels.set(queueName, channel as any);
    }

    return this.channels.get(queueName)!;
  }

  static async purgeQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel(queueName);
    await channel.purgeQueue(queueName);
  }

  static async deleteQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel(queueName);
    await channel.deleteQueue(queueName);
    this.channels.delete(queueName);
  }

  static async assertExchange(
    exchangeName: string,
    type: 'direct' | 'topic' | 'headers' | 'fanout' = 'topic'
  ): Promise<void> {
    const conn = await this.getConnection();
    const channel = await (conn as any).createChannel();
    await channel.assertExchange(exchangeName, type, { durable: true });
    await channel.close();
  }

  static async bindQueue(
    queueName: string,
    exchangeName: string,
    routingKey: string
  ): Promise<void> {
    const channel = await this.getChannel(queueName);
    await channel.bindQueue(queueName, exchangeName, routingKey);
  }

  static async publish(
    exchangeName: string,
    routingKey: string,
    content: Buffer
  ): Promise<void> {
    const conn = await this.getConnection();
    const channel = await (conn as any).createChannel();

    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    channel.publish(exchangeName, routingKey, content);
    await channel.close();
  }

  static async consume(
    queueName: string,
    handler: MessageHandler
  ): Promise<string> {
    const channel = await this.getChannel(queueName);
    const { consumerTag } = await channel.consume(queueName, handler, {
      noAck: false,
    });

    if (consumerTag) {
      this.consumers.set(`${queueName}:${consumerTag}`, consumerTag);
    }

    return consumerTag!;
  }

  static async cancel(consumerTag: string): Promise<void> {
    const conn = await this.getConnection();
    const channel = await (conn as any).createChannel();

    await channel.cancel(consumerTag);

    for (const [key, tag] of Array.from(this.consumers.entries())) {
      if (tag === consumerTag) {
        this.consumers.delete(key);
        break;
      }
    }

    await channel.close();
  }

  static async getMessages(queueName: string, limit = 100): Promise<any[]> {
    const lib = await getAmqplib();
    const conn = await this.getConnection();
    const channel = await (conn as any).createChannel();

    const messages: any[] = [];

    const queueInfo = await channel.checkQueue(queueName);
    const count = Math.min(limit, queueInfo.messageCount);

    for (let i = 0; i < count; i++) {
      const message = await channel.get(queueName, { noAck: false });
      if (message) {
        messages.push(JSON.parse(message.content.toString()));
        await channel.nack(message, false, true);
      }
    }

    await channel.close();
    return messages;
  }

  static async reset(): Promise<void> {
    for (const consumerTag of Array.from(this.consumers.values())) {
      try {
        await this.cancel(consumerTag);
      } catch {
        // Ignore errors during reset
      }
    }
    this.consumers.clear();

    for (const [queueName, channel] of Array.from(this.channels.entries())) {
      try {
        await channel.purgeQueue(queueName);
      } catch {
        // Queue might not exist
      }
    }
  }

  static async stop(): Promise<void> {
    for (const consumerTag of Array.from(this.consumers.values())) {
      try {
        await this.cancel(consumerTag);
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.consumers.clear();

    for (const channel of Array.from(this.channels.values())) {
      try {
        await channel.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.channels.clear();

    if (this.connection) {
      try {
        await (this.connection as any).close();
      } catch {
        // Ignore errors during cleanup
      }
      this.connection = undefined;
    }

    if (this.instance) {
      await this.instance.stop();
      this.instance = undefined;
    }
  }

  static isRunning(): boolean {
    return this.instance !== undefined;
  }

  static getHost(): string {
    if (!this.instance) {
      throw new Error('Container not started. Call start() first.');
    }
    return this.instance.getHost();
  }
}
