import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

const envFile = process.env.NODE_ENV === 'development' ? '.env.dev' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`Loading env from: ${envFile}`);
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
