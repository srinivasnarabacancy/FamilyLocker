import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User, Family } from '@prisma/client';

export type AuthUser = User & { family: Family | null };

/** Equivalent of `$request->user()`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

/** `$request->user()->family_id`, which every module scopes its queries by. */
export const FamilyId = createParamDecorator((_d: unknown, ctx: ExecutionContext): bigint => {
  return ctx.switchToHttp().getRequest().user.familyId;
});
