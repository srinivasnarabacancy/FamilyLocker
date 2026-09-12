import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../common/prisma.service';

/**
 * Sanctum-compatible personal access tokens.
 *
 * Wire format is exactly Sanctum's `{id}|{plainText}`, and the stored value is
 * the SHA-256 hex of the plaintext. That means tokens minted by the Laravel app
 * authenticate here and vice-versa — which is what makes it safe to run both
 * backends side by side during the cutover.
 */
@Injectable()
export class TokenService {
  /** Sanctum's default token name. */
  static readonly DEFAULT_NAME = 'auth_token';

  constructor(private readonly prisma: PrismaService) {}

  private hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }

  /** Creates a token row and returns the plaintext value to hand to the client. */
  async create(userId: bigint, name = TokenService.DEFAULT_NAME): Promise<string> {
    // Sanctum uses Str::random(40).
    const plain = randomBytes(30).toString('base64url').slice(0, 40);
    const now = new Date();

    const row = await this.prisma.personalAccessToken.create({
      data: {
        tokenableType: 'App\\Models\\User',
        tokenableId: userId,
        name,
        token: this.hash(plain),
        abilities: '["*"]',
        createdAt: now,
        updatedAt: now,
      },
      select: { id: true },
    });

    return `${row.id}|${plain}`;
  }

  /** Resolves a bearer token to its user, or null. Also refreshes last_used_at. */
  async resolve(bearer: string | undefined) {
    if (!bearer) return null;

    const separator = bearer.indexOf('|');
    if (separator < 1) return null;

    const id = bearer.slice(0, separator);
    const plain = bearer.slice(separator + 1);
    if (!/^\d+$/.test(id) || !plain) return null;

    const record = await this.prisma.personalAccessToken.findUnique({
      where: { id: BigInt(id) },
    });
    if (!record) return null;

    // Constant-time comparison, as Sanctum does.
    const expected = Buffer.from(record.token, 'utf8');
    const actual = Buffer.from(this.hash(plain), 'utf8');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: record.tokenableId },
      include: { family: true },
    });
    if (!user) return null;

    // Fire-and-forget: a failed touch must not fail the request.
    this.prisma.personalAccessToken
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return { user, tokenId: record.id };
  }

  async revoke(tokenId: bigint): Promise<void> {
    await this.prisma.personalAccessToken.delete({ where: { id: tokenId } }).catch(() => undefined);
  }
}
