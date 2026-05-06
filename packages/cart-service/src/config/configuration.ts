export default () => ({
  port: parseInt(process.env.CART_PORT ?? '3009', 10),
  databaseUrl: process.env.CART_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5439/cart',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});
