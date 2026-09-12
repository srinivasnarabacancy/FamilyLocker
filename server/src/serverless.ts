import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp, enableBigIntSerialization } from './configure-app';

/**
 * Serverless entry point for Vercel.
 *
 * The difference from `main.ts` is that this NEVER calls `listen()`. A Vercel
 * function is handed an existing request/response pair, so the app must be
 * initialised and its Express instance exported as a handler instead of
 * binding a port — a listening process would simply time out.
 *
 * The instance is cached across invocations: Vercel reuses a warm container for
 * consecutive requests, so rebuilding the Nest container every time would add
 * hundreds of milliseconds and open a new database connection each call.
 */
enableBigIntSerialization();

let cached: express.Express | null = null;
let building: Promise<express.Express> | null = null;

export async function createApp(): Promise<express.Express> {
  if (cached) return cached;

  // Concurrent cold-start requests must share one initialisation, not race to
  // build several Nest containers against the same connection-limited pool.
  if (building) return building;

  building = (async () => {
    const expressApp = express();

    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      bodyParser: false,
      logger: ['error', 'warn', 'log'],
    });

    configureApp(app);

    // init(), not listen().
    await app.init();

    cached = expressApp;
    return expressApp;
  })();

  try {
    return await building;
  } finally {
    building = null;
  }
}

/** Vercel invokes this for every request routed to the function. */
export default async function handler(req: express.Request, res: express.Response) {
  const app = await createApp();
  return app(req, res);
}
