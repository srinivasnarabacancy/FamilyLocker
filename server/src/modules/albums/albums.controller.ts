import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req,
  UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Photo } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../common/storage.service';
import { ActivityLogService } from '../../common/activity-log.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { validate, UploadedFile as FileType } from '../../common/validator';
import { success, paginate, pageFrom } from '../../common/laravel';
import { presentAlbum, presentPhoto } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick } from '../../common/input';

const PER_PAGE = 12;

/** Port of App\Http\Controllers\Api\AlbumController. */
@Controller('albums')
@UseGuards(AuthGuard, VerifiedGuard)
export class AlbumsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly activity: ActivityLogService,
  ) {}

  private async findOrFail(id: string, familyId: bigint) {
    const album = await this.prisma.album.findFirst({ where: { id: BigInt(id), familyId } });
    if (!album) throw new NotFoundException('Album not found');
    return album;
  }

  @Get()
  async index(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const where = { familyId: user.familyId! };
    const page = pageFrom(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.album.findMany({
        where,
        include: { user: true, _count: { select: { photos: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      this.prisma.album.count({ where }),
    ]);

    return success(
      paginate(rows.map(presentAlbum), total, page, PER_PAGE, `${req.protocol}://${req.get('host')}${req.path}`),
    );
  }

  @Post()
  @HttpCode(201)
  async store(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      name: 'required|string|max:255',
      description: 'nullable|string',
    });

    const now = new Date();
    const album = await this.prisma.album.create({
      data: {
        ...(pick(body, { name: ['name'], description: ['description'] }) as any),
        familyId: user.familyId!,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    await this.activity.log(
      user.id, user.familyId!, 'albums', 'created', `Created album: ${album.name}`,
    );

    return success(presentAlbum(album), 'Album created');
  }

  /**
   * Declared before `:id` routes so `albums/photos/123` is not captured as an
   * album id — the same ordering constraint the Laravel route file relies on.
   */
  @Delete('photos/:photoId')
  async deletePhoto(@Param('photoId') photoId: string, @CurrentUser() user: AuthUser) {
    const photo = await this.prisma.photo.findFirst({
      where: { id: BigInt(photoId), album: { familyId: user.familyId! } },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    await this.storage.delete(photo.filePath);
    await this.prisma.photo.delete({ where: { id: photo.id } });

    return success(null, 'Photo deleted');
  }

  @Get(':id')
  async show(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const album = await this.prisma.album.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { user: true, photos: true },
    });
    if (!album) throw new NotFoundException('Album not found');

    return success(presentAlbum(album));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    const album = await this.prisma.album.update({
      where: { id: existing.id },
      data: {
        ...pick(body, { name: ['name'], description: ['description'] }),
        updatedAt: new Date(),
      },
    });

    return success(presentAlbum(album), 'Album updated');
  }

  @Delete(':id')
  async destroy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const album = await this.findOrFail(id, user.familyId!);

    const photos = await this.prisma.photo.findMany({ where: { albumId: album.id } });
    for (const photo of photos) {
      await this.storage.delete(photo.filePath);
    }

    // Photo rows go with the album via ON DELETE CASCADE.
    await this.prisma.album.delete({ where: { id: album.id } });

    return success(null, 'Album deleted');
  }

  @Post(':id/photos')
  @HttpCode(201)
  @UseInterceptors(FilesInterceptor('photos'))
  async uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() photos: FileType[] | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const album = await this.findOrFail(id, user.familyId!);

    await validate({ photos: photos ?? [] }, {
      photos: 'required|array|min:1',
      'photos.*': 'required|file|mimes:jpg,jpeg,png,gif,webp|max:20480',
    });

    const now = new Date();
    const uploaded: Photo[] = [];

    for (const file of photos!) {
      const filePath = await this.storage.store(file, `albums/${album.id}`);
      uploaded.push(
        await this.prisma.photo.create({
          data: {
            albumId: album.id,
            userId: user.id,
            filePath,
            fileName: file.originalname,
            // Column is a varchar, so the size is stored as a string.
            fileSize: String(file.size),
            createdAt: now,
            updatedAt: now,
          },
        }),
      );
    }

    // First upload into an empty album also becomes its cover.
    if (!album.coverPhoto && uploaded.length > 0) {
      await this.prisma.album.update({
        where: { id: album.id },
        data: { coverPhoto: uploaded[0].filePath, updatedAt: new Date() },
      });
    }

    await this.activity.log(
      user.id, user.familyId!, 'albums', 'photos_uploaded',
      `Uploaded ${uploaded.length} photos to ${album.name}`,
    );

    return success(uploaded.map(presentPhoto), `${uploaded.length} photo(s) uploaded`);
  }

  @Post(':albumId/cover/:photoId')
  async setCover(
    @Param('albumId') albumId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const album = await this.findOrFail(albumId, user.familyId!);

    const photo = await this.prisma.photo.findFirst({
      where: { id: BigInt(photoId), albumId: album.id },
    });
    if (!photo) throw new NotFoundException('Photo not found');

    await this.prisma.album.update({
      where: { id: album.id },
      data: { coverPhoto: photo.filePath, updatedAt: new Date() },
    });

    return success(null, 'Cover photo set');
  }
}
