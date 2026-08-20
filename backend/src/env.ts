import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('90d'),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_DEV_MODE: z.coerce.boolean().default(true),
  SMS_PROVIDER: z.enum(['none', 'msg91', 'twilio']).default('none'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  CORS_ORIGINS: z.string().default('*'),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === 'production';
