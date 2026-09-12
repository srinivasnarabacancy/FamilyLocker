import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from './token.service';
import { ForbiddenException, UnauthorizedException } from '../common/errors';

/** Port of the `auth:sanctum` middleware. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const header = req.headers.authorization ?? '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : undefined;

    const resolved = await this.tokens.resolve(bearer);
    if (!resolved) throw new UnauthorizedException();

    (req as any).user = resolved.user;
    (req as any).tokenId = resolved.tokenId;

    return true;
  }
}

/**
 * Port of the `verified` middleware, matching User::hasVerifiedEmail():
 * an account with no e-mail address is treated as verified.
 */
@Injectable()
export class VerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;

    const verified = !user?.email || user.emailVerifiedAt !== null;
    if (!verified) throw new ForbiddenException('Your email address is not verified.');

    return true;
  }
}
