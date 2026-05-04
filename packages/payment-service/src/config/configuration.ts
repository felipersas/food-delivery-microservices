export default () => ({
  port: parseInt(process.env.PAYMENT_PORT ?? '3003', 10),
  dbDriver: process.env.DB_DRIVER,
  databaseUrl: process.env.PAYMENT_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/payments',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});
