export default () => ({
  port: parseInt(process.env.NOTIFICATION_PORT ?? '3004', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});
