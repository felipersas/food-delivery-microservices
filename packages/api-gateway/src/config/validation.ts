import Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_GATEWAY_PORT: Joi.number().port().default(3000),
  RABBITMQ_URL: Joi.string().uri().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('food-ordering'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  ORDER_SERVICE_URL: Joi.string().uri().default('http://localhost:3001'),
  KITCHEN_SERVICE_URL: Joi.string().uri().default('http://localhost:3002'),
  PAYMENT_SERVICE_URL: Joi.string().uri().default('http://localhost:3003'),
  NOTIFICATION_SERVICE_URL: Joi.string().uri().default('http://localhost:3004'),
  ANALYTICS_SERVICE_URL: Joi.string().uri().default('http://localhost:3005'),
  JWT_SECRET: Joi.string().min(32).default('secret-change-in-production-min-32-chars-long'),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
});
