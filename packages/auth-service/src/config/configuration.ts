export default () => ({
  port: parseInt(process.env.AUTH_PORT ?? '3008', 10),
  databaseUrl: process.env.AUTH_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5438/auth',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  refreshToken: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  },
});
