export default () => ({
  port: parseInt(process.env.CUSTOMER_PORT ?? '3006', 10),
  dbDriver: process.env.DB_DRIVER,
  databaseUrl: process.env.CUSTOMER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5436/customers',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});
