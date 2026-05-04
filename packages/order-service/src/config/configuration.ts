export default () => ({
  port: parseInt(process.env.ORDER_PORT ?? '3001', 10),
  dbDriver: process.env.DB_DRIVER,
  databaseUrl: process.env.ORDER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
});
