import Joi from 'joi';

export const validationSchema = Joi.object({
  RESTAURANT_PORT: Joi.number().default(3007).port(),
  DB_DRIVER: Joi.string().valid('postgres', 'memory').default('memory'),
  RESTAURANT_DATABASE_URL: Joi.string().default('postgres://postgres:postgres@localhost:5437/restaurants'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('food-ordering'),
});
