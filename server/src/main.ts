import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { static as serveStatic } from 'express';
import { existsSync } from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { configureApp, enableBigIntSerialization } from './configure-app';

/**
 * Long-running server, used for local development and any host that runs a
 * persistent process. Vercel uses `serverless.ts` instead, which shares the
 * same configuration but exports a handler rather than binding a port.
 */
async function bootstrap() {
  enableBigIntSerialization();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  configureApp(app);

  // Only this entry point serves the SPA and uploads. On Vercel the CDN serves
  // static files and Supabase serves uploads, so the function never sees them.
  serveSpaAndUploads(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  new Logger('Bootstrap').log(`FamilyLocker API listening on :${port}`);
}

/**
 * Serves the built Vue SPA and locally-stored uploads from the same process, so
 * a deployment is one service rather than two. Skipped when `dist/` is absent,
 * which is the normal case in development — Vite serves the app on :5173 and
 * proxies /api here.
 *
 * With STORAGE_DRIVER=supabase the /storage route is unnecessary (files are
 * served by Supabase), but it is harmless and keeps the local driver working.
 */
function serveSpaAndUploads(app: any) {
  const logger = new Logger('Static');

  const storageRoot =
    process.env.STORAGE_ROOT ?? path.resolve(process.cwd(), '..', 'storage', 'app', 'public');
  if (existsSync(storageRoot)) {
    app.use('/storage', serveStatic(storageRoot));
    logger.log(`Serving uploads from ${storageRoot}`);
  }

  const spaDir = process.env.SPA_DIR ?? path.resolve(process.cwd(), '..', 'dist');
  if (!existsSync(spaDir)) {
    logger.log('No SPA build found — API only (run `npm run build` at the project root)');
    return;
  }

  app.use(serveStatic(spaDir, { index: false }));

  // History-mode fallback. Anything that is not an API call, an upload, or a
  // request for a real file with an extension resolves to the SPA shell.
  app.use((req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/storage')) return next();
    if (path.extname(req.path)) return next();

    return res.sendFile(path.join(spaDir, 'index.html'));
  });

  logger.log(`Serving SPA from ${spaDir}`);
}

bootstrap();
