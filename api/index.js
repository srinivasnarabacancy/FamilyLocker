/**
 * Vercel serverless function for the whole API.
 *
 * CommonJS — see api/package.json for why. Vercel only detects .js/.ts/.mjs in
 * this directory, and ESM here gets bundled by esbuild in a way that breaks
 * NestJS dependency injection.
 *
 * The Nest code is compiled ahead of time by tsc (`cd server && npm run build`)
 * and only required from here: esbuild does not support emitDecoratorMetadata,
 * which Nest cannot work without.
 *
 * Every request under /api/* is rewritten here by vercel.json.
 */
const serverless = require('../server/dist/serverless');

const handler = serverless.default || serverless;

module.exports = (req, res) => handler(req, res);
