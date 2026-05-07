import * as amqp from 'amqplib';

type MessageHandler = (msg: amqp.ConsumeMessage | null) => void;

/**
 * RabbitMQ connection helper for integration tests
 * Uses existing Docker infrastructure instead of Testcontainers
 */
export class DockerRabbitMQ {
  private static connection?: amqp.Connection;
  private static channels: Map<string, amqp.Channel> = new Map();
  private static connected = false;

  static async connect(
    url = 'amqp://guest:guest@localhost:5672'
  ): Promise<void> {
    if (this.connected) return;

    this.connection = await amqp.connect(url);
    this.connected = true;
  }

  static async getChannel(queueName: string): Promise<amqp.Channel> {
    if (!this.channels.has(queueName)) {
      if (!this.connection) {
        await this.connect();
      }

      const channel = await this.connection.createChannel();
      await channel.assertQueue(queueName, { durable: true });
      this.channels.set(queueName, channel);
    }

    return this.channels.get(queueName)!;
  }

  static async publish(
    exchangeName: string,
    routingKey: string,
    content: Buffer
  ): Promise<void> {
    if (!this.connection) {
      await this.connect();
    }

    const channel = await this.connection.createChannel();
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
    return consumerTag!;
  }

  static async purgeQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel(queueName);
    await channel.purgeQueue(queueName);
  }

  static async closeAll(): Promise<void> {
    for (const channel of Array.from(this.channels.values())) {
      await channel.close().catch(() => {});
    }
    this.channels.clear();

    if (this.connection) {
      await this.connection.close().catch(() => {});
      this.connection = undefined;
    }
    this.connected = false;
  }

  static async isAvailable(url = 'amqp://guest:guest@localhost:5672'): Promise<boolean> {
    try {
      const conn = await amqp.connect(url);
      await conn.close();
      return true;
    } catch {
      return false;
    }
  }
}
