/**
 * Vercel serverless function for the whole API.
 *
 * ES module syntax, because the root package.json declares `"type": "module"`
 * for Vite. It cannot be `.cjs`: Vercel only detects `.js`, `.ts` and `.mjs`
 * inside `api/` as Serverless Functions, and a `.cjs` file fails the build with
 * "doesn't match any Serverless Functions".
 *
 * The Nest code it imports is compiled by `tsc` (`cd server && npm run build`)
 * rather than imported as TypeScript. Vercel compiles `api/` with esbuild,
 * which does not support `emitDecoratorMetadata` — and NestJS dependency
 * injection cannot work without it.
 *
 * Every request under /api/* is rewritten here by vercel.json.
 */
import serverless from '../server/dist/serverless.js';

// Importing CommonJS from ESM yields `module.exports` as the default binding,
// so the handler sits one level down. The fallback keeps this working if the
// server build ever emits a real ES module.
const handler = serverless.default ?? serverless;

export default function (req, res) {
  return handler(req, res);
}
