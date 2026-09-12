import * as bcrypt from 'bcryptjs';

/**
 * Laravel hashes with bcrypt at cost 12 (BCRYPT_ROUNDS default) and emits the
 * `$2y$` prefix. bcryptjs verifies `$2y$` hashes, so existing passwords keep
 * working untouched — no forced reset, no user-visible migration.
 *
 * Hashes generated here use `$2a$`, which PHP's password_verify() also accepts,
 * so a password changed on the Node side still works on the Laravel side.
 */
const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, ROUNDS);
}

export function checkPassword(plain: string, hash: string): boolean {
  if (!hash) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}
