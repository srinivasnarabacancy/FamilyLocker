import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { StorageService } from './storage.service';
import { NotFoundException } from './errors';

/**
 * Serves uploads at `/storage/<path>`, the URL the SPA has always used
 * (`<img :src="`/storage/${doc.file_path}`">`) and the one Laravel's public
 * disk exposed.
 *
 * Locally this is redundant — `main.ts` mounts express.static over the same
 * prefix and answers first. On Vercel nothing did: `vercel.json` rewrites
 * `/storage/(.*)` into this function, but no route matched, so every uploaded
 * image resolved to the SPA shell. This is that missing route, and it works
 * for both drivers.
 *
 * Deliberately unauthenticated, matching the Laravel behaviour it replaces:
 * paths are 40 random characters and are treated as the capability. It does
 * mean the Supabase bucket can stay private — files are read with the service
 * key here rather than exposed by a public bucket.
 */
@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('*')
  async serve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const relative = decodeURIComponent(req.path).replace(/^\/storage\/+/, '');

    const file = await this.storage.read(relative);
    if (!file) throw new NotFoundException('File not found');

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', String(file.buffer.length));
    // Immutable: stored names are random and a path is never reused.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.end(file.buffer);
  }
}
