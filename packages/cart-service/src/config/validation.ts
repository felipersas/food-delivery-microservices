import Joi from 'joi';

export const validationSchema = Joi.object({
  CART_PORT: Joi.number().default(3009),
  CART_DATABASE_URL: Joi.string(),
  RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('food-ordering'),
});
