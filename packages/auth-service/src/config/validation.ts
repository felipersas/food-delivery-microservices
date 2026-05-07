import Joi from 'joi';

export const validationSchema = Joi.object({
  AUTH_PORT: Joi.number().default(3008).port(),
  AUTH_DATABASE_URL: Joi.string().default(
    'postgres://postgres:postgres@localhost:5438/auth',
  ),
  RABBITMQ_URL: Joi.string().default('amqp://guest:guest@localhost:5672'),
  RABBITMQ_EXCHANGE: Joi.string().default('food-ordering'),
  JWT_SECRET: Joi.string().default(
    'secret-change-in-production-min-32-chars-long',
  ),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
});
