import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  CUSTOMER_PORT: Joi.number().default(3006),
  DB_DRIVER: Joi.string().valid('postgres', 'memory', '').allow(''),
  CUSTOMER_DATABASE_URL: Joi.string(),
  RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('food-ordering'),
});
