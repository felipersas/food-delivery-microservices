export default () => ({
  port: {
    type: 'number',
    min: 1024,
    max: 65535,
    default: 3006,
  },
  dbDriver: {
    type: 'string',
    enum: ['postgres', 'memory'],
    optional: true,
  },
  databaseUrl: {
    type: 'string',
    optional: true,
  },
  nodeEnv: {
    type: 'string',
    enum: ['development', 'production', 'test'],
    default: 'development',
  },
  rabbitmq: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        default: 'amqp://guest:guest@localhost:5672',
      },
      exchange: {
        type: 'string',
        default: 'food-ordering',
      },
    },
  },
});
