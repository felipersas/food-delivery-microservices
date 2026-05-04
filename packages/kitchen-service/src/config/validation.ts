import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  KITCHEN_PORT: Joi.number().default(3002),
  DB_DRIVER: Joi.string().valid('postgres', 'memory', '').allow(''),
  KITCHEN_DATABASE_URL: Joi.string(),
  RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('food-ordering'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
});
