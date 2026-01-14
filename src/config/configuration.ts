export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',

  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '10m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '1d',
  },

  genai: {
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
  },

  credits: {
    defaultValidityDays: parseInt(
      process.env.DEFAULT_CREDIT_VALIDITY_DAYS ?? '90',
      10,
    ),
    costPerToken: parseFloat(process.env.CREDIT_COST_PER_TOKEN ?? '0.01'),
  },
});
