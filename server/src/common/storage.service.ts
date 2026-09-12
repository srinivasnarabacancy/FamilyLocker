import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { UploadedFile } from './validator';

export interface StoredFile {
  buffer: Buffer;
  contentType: string;
}

/**
 * Only the types `mimes:pdf,jpg,jpeg,png` validation lets in, plus the avatar
 * formats. Anything else is served as a download rather than guessed at.
 */
const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

function contentTypeFor(relative: string): string {
  const ext = (relative.split('.').pop() ?? '').toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * Replacement for Laravel's `Storage::disk('public')`.
 *
 * Paths stored in the database (`documents/AbC….pdf`) are unchanged, so files
 * uploaded by the Laravel app stay reachable and vice-versa.
 *
 * Two drivers:
 *  - `local`    — writes to storage/app/public, byte-compatible with Laravel.
 *  - `supabase` — Supabase Storage over its REST API.
 *
 * Production should use `supabase`. The Laravel app writes to the local disk
 * even on Vercel, whose filesystem is ephemeral (api/index.php redirects
 * storage into /tmp), so uploads there do not survive between invocations.
 * That is a pre-existing bug this port is intended to fix.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  private readonly driver = process.env.STORAGE_DRIVER ?? 'local';
  private readonly root =
    process.env.STORAGE_ROOT ?? path.resolve(process.cwd(), '..', 'storage', 'app', 'public');
  private readonly supabaseUrl = process.env.SUPABASE_URL ?? '';
  private readonly supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? '';
  private readonly bucket = process.env.SUPABASE_BUCKET ?? 'public';

  /**
   * A misconfigured driver used to surface as an opaque 500 from the exception
   * filter, which is what made "Server Error" on upload so hard to place. Fail
   * with a message that names the missing variable instead.
   */
  private assertConfigured(): void {
    if (this.driver !== 'supabase') return;

    const missing = [
      !this.supabaseUrl && 'SUPABASE_URL',
      !this.supabaseKey && 'SUPABASE_SERVICE_KEY',
    ].filter(Boolean);

    if (missing.length) {
      throw new Error(
        `STORAGE_DRIVER=supabase but ${missing.join(' and ')} ` +
          `${missing.length > 1 ? 'are' : 'is'} not set.`,
      );
    }
  }

  /**
   * `/storage/*` is public and unauthenticated, and the controller decodes the
   * path before handing it over — so `%2e%2e%2f` arrives here as `../` having
   * survived Express's own normalisation. Both drivers need it rejected: on
   * local it would climb out of the root, and on Supabase it would climb out of
   * the bucket into the rest of an API being called with the service key.
   */
  private safeRelative(relative: string): string | null {
    const segments = relative.split('/').filter((s) => s !== '' && s !== '.');

    if (!segments.length) return null;
    if (segments.some((s) => s === '..' || s.includes('\\') || s.includes('\0'))) return null;

    return segments.join('/');
  }

  /** Maps a sanitised path onto the local disk, verifying containment again. */
  private resolveLocal(relative: string): string | null {
    const target = path.resolve(this.root, relative);
    const root = path.resolve(this.root);

    return target === root || target.startsWith(root + path.sep) ? target : null;
  }

  /**
   * Laravel's `store()` names files `Str::random(40).ext`. Reproduced so paths
   * are indistinguishable between the two backends.
   */
  private generateName(file: UploadedFile): string {
    const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();
    const name = randomBytes(30).toString('base64url').slice(0, 40);
    return ext ? `${name}.${ext}` : name;
  }

  /** Stores under `directory/` and returns the relative path to persist. */
  async store(file: UploadedFile, directory: string): Promise<string> {
    this.assertConfigured();

    const relative = `${directory}/${this.generateName(file)}`;

    if (this.driver === 'supabase') {
      await this.supabaseUpload(relative, file);
    } else {
      const target = path.join(this.root, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.buffer);
    }

    return relative;
  }

  /**
   * Reads a stored file back. `null` means "not there", which the controller
   * turns into a 404; anything else (auth, network) throws, because a
   * misconfigured bucket must not look like a missing file.
   */
  async read(relative: string): Promise<StoredFile | null> {
    this.assertConfigured();

    const safe = this.safeRelative(relative);
    if (!safe) return null;

    if (this.driver === 'supabase') return this.supabaseDownload(safe);

    const target = this.resolveLocal(safe);
    if (!target) return null;

    try {
      return { buffer: await fs.readFile(target), contentType: contentTypeFor(relative) };
    } catch (err: any) {
      if (err?.code === 'ENOENT' || err?.code === 'EISDIR') return null;
      throw err;
    }
  }

  /** Best-effort delete; a missing file is not an error, matching Laravel. */
  async delete(relative: string | null | undefined): Promise<void> {
    if (!relative) return;

    try {
      if (this.driver === 'supabase') {
        await this.supabaseDelete(relative);
      } else {
        await fs.unlink(path.join(this.root, relative));
      }
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        this.logger.warn(`Failed to delete ${relative}: ${err?.message ?? err}`);
      }
    }
  }

  private async supabaseUpload(relative: string, file: UploadedFile): Promise<void> {
    const res = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${relative}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': file.mimetype,
          'x-upsert': 'true',
        },
        body: new Uint8Array(file.buffer),
      },
    );

    if (!res.ok) {
      throw new Error(`Supabase upload failed (${res.status}): ${await res.text()}`);
    }
  }

  private async supabaseDownload(relative: string): Promise<StoredFile | null> {
    const encoded = relative.split('/').map(encodeURIComponent).join('/');

    const res = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${encoded}`,
      { headers: { Authorization: `Bearer ${this.supabaseKey}` } },
    );

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Supabase download failed (${res.status}): ${await res.text()}`);
    }

    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get('content-type') ?? contentTypeFor(relative),
    };
  }

  private async supabaseDelete(relative: string): Promise<void> {
    await fetch(`${this.supabaseUrl}/storage/v1/object/${this.bucket}/${relative}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    });
  }
}
