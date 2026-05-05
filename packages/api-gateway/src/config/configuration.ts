export default () => ({
  port: parseInt(process.env.API_GATEWAY_PORT ?? '3000', 10),
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  services: {
    order: {
      url: process.env.ORDER_SERVICE_URL ?? 'http://localhost:3001',
      timeout: parseInt(process.env.ORDER_SERVICE_TIMEOUT ?? '5000', 10),
    },
    kitchen: {
      url: process.env.KITCHEN_SERVICE_URL ?? 'http://localhost:3002',
      timeout: parseInt(process.env.KITCHEN_SERVICE_TIMEOUT ?? '5000', 10),
    },
    payment: {
      url: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003',
      timeout: parseInt(process.env.PAYMENT_SERVICE_TIMEOUT ?? '5000', 10),
    },
    notification: {
      url: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004',
      timeout: parseInt(process.env.NOTIFICATION_SERVICE_TIMEOUT ?? '5000', 10),
    },
    analytics: {
      url: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005',
      timeout: parseInt(process.env.ANALYTICS_SERVICE_TIMEOUT ?? '5000', 10),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
});
