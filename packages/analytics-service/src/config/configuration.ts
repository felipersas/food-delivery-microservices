export default () => ({
  port: parseInt(process.env.ANALYTICS_PORT ?? '3005', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});
