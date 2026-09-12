import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../common/storage.service';
import { ActivityLogService } from '../../common/activity-log.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { validate, UploadedFile as FileType } from '../../common/validator';
import { success, paginate, pageFrom } from '../../common/laravel';
import { presentDocument } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick, like, filled, toDate } from '../../common/input';

const PER_PAGE = 15;

/** Port of App\Http\Controllers\Api\DocumentController. */
@Controller('documents')
@UseGuards(AuthGuard, VerifiedGuard)
export class DocumentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly activity: ActivityLogService,
  ) {}

  private async findOrFail(id: string, familyId: bigint) {
    const document = await this.prisma.document.findFirst({
      where: { id: BigInt(id), familyId },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  @Get()
  async index(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const where: Prisma.DocumentWhereInput = { familyId: user.familyId! };

    if (filled(query.type)) where.type = query.type;
    if (filled(query.member_name)) where.memberName = like(query.member_name);
    if (filled(query.search)) {
      where.OR = [
        { title: like(query.search) },
        { documentNumber: like(query.search) },
        { memberName: like(query.search) },
      ];
    }

    const page = pageFrom(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: { uploader: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      this.prisma.document.count({ where }),
    ]);

    return success(
      paginate(rows.map(presentDocument), total, page, PER_PAGE, `${req.protocol}://${req.get('host')}${req.path}`),
    );
  }

  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file'))
  async store(
    @Body() body: any,
    @UploadedFile() file: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    await validate({ ...body, file }, {
      title: 'required|string|max:255',
      type: 'required|string|in:aadhaar,pan,passport,driving_license,birth_certificate,voter_id,other',
      member_name: 'required|string|max:255',
      document_number: 'nullable|string|max:100',
      issue_date: 'nullable|date',
      expiry_date: 'nullable|date|after_or_equal:issue_date',
      notes: 'nullable|string',
      is_reminder_enabled: 'boolean',
      reminder_days_before: 'integer|min:1|max:365',
      file: 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png',
    });

    const now = new Date();
    const data: Prisma.DocumentUncheckedCreateInput = {
      ...(pick(body, {
        title: ['title'],
        type: ['type'],
        member_name: ['memberName'],
        document_number: ['documentNumber'],
        issue_date: ['issueDate', 'date'],
        expiry_date: ['expiryDate', 'date'],
        notes: ['notes'],
        is_reminder_enabled: ['isReminderEnabled', 'bool'],
        reminder_days_before: ['reminderDaysBefore', 'int'],
      }) as any),
      familyId: user.familyId!,
      uploadedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    if (file) {
      data.filePath = await this.storage.store(file, 'documents');
      data.fileName = file.originalname;
    }

    const document = await this.prisma.document.create({ data, include: { uploader: true } });

    await this.activity.log(
      user.id, user.familyId!, 'documents', 'created', `Added document: ${document.title}`,
    );

    return success(presentDocument(document), 'Document added successfully');
  }

  @Get('expiring')
  async expiring(@Query() query: any, @CurrentUser() user: AuthUser) {
    const days = filled(query.days) ? Number(query.days) : 30;
    const now = new Date();
    const until = new Date(now.getTime() + days * 86_400_000);

    const documents = await this.prisma.document.findMany({
      where: {
        familyId: user.familyId!,
        expiryDate: { not: null, gte: toDate(now.toISOString().slice(0, 10))!, lte: toDate(until.toISOString().slice(0, 10))! },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return success(documents.map(presentDocument));
  }

  @Get(':id')
  async show(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const document = await this.prisma.document.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { uploader: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    return success(presentDocument(document));
  }

  /** POST, not PUT — the route exists to carry multipart file replacements. */
  @Post(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const existing = await this.findOrFail(id, user.familyId!);

    await validate({ ...body, file }, {
      title: 'sometimes|string|max:255',
      type: 'sometimes|string|in:aadhaar,pan,passport,driving_license,birth_certificate,voter_id,other',
      member_name: 'sometimes|string|max:255',
      document_number: 'nullable|string|max:100',
      issue_date: 'nullable|date',
      expiry_date: 'nullable|date',
      notes: 'nullable|string',
      is_reminder_enabled: 'boolean',
      reminder_days_before: 'integer|min:1|max:365',
      file: 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png',
    });

    const data: Prisma.DocumentUncheckedUpdateInput = {
      ...(pick(body, {
        title: ['title'],
        type: ['type'],
        member_name: ['memberName'],
        document_number: ['documentNumber'],
        issue_date: ['issueDate', 'date'],
        expiry_date: ['expiryDate', 'date'],
        notes: ['notes'],
        is_reminder_enabled: ['isReminderEnabled', 'bool'],
        reminder_days_before: ['reminderDaysBefore', 'int'],
      }) as any),
      updatedAt: new Date(),
    };

    if (file) {
      await this.storage.delete(existing.filePath);
      data.filePath = await this.storage.store(file, 'documents');
      data.fileName = file.originalname;
    }

    const document = await this.prisma.document.update({
      where: { id: existing.id },
      data,
      include: { uploader: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'documents', 'updated', `Updated document: ${document.title}`,
    );

    return success(presentDocument(document), 'Document updated successfully');
  }

  @Delete(':id')
  async destroy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const document = await this.findOrFail(id, user.familyId!);

    await this.storage.delete(document.filePath);
    await this.prisma.document.delete({ where: { id: document.id } });

    await this.activity.log(
      user.id, user.familyId!, 'documents', 'deleted', `Deleted document: ${document.title}`,
    );

    return success(null, 'Document deleted successfully');
  }
}
