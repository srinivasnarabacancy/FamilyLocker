import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { UploadedFile } from './validator';

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

  private async supabaseDelete(relative: string): Promise<void> {
    await fetch(`${this.supabaseUrl}/storage/v1/object/${this.bucket}/${relative}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    });
  }
}
