export default () => ({
  port: parseInt(process.env.RESTAURANT_PORT ?? '3007', 10),
  dbDriver: process.env.DB_DRIVER,
  databaseUrl: process.env.RESTAURANT_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5437/restaurants',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});
