/**
 * Vercel serverless function for the whole API.
 *
 * Plain JavaScript on purpose. Vercel compiles files in `api/` with esbuild,
 * which does not support `emitDecoratorMetadata` — NestJS dependency injection
 * depends on that metadata, so the Nest code must be compiled by `tsc` first
 * (`cd server && npm run build`) and only required from here.
 *
 * Every request under /api/* is rewritten to this file by vercel.json.
 *
 * The .cjs extension is required: the root package.json declares
 * `"type": "module"` for Vite, which would otherwise make this file ESM and
 * break `require()`.
 */
const handler = require('../server/dist/serverless').default;

module.exports = (req, res) => handler(req, res);
