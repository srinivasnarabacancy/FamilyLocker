import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req,
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
import { presentMedicalRecord, presentMedicine, presentAppointment } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick, like, filled, toBool, toBigInt } from '../../common/input';
import { today } from '../../common/reminder-logic';

const PER_PAGE = 15;

/** Port of App\Http\Controllers\Api\MedicalController. */
@Controller('medical')
@UseGuards(AuthGuard, VerifiedGuard)
export class MedicalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly activity: ActivityLogService,
  ) {}

  private recordsCtx() {
    return {
      countWhere: async (table: string, column: string, value: any) => {
        if (table !== 'medical_records') throw new Error(`Unexpected table "${table}"`);
        return this.prisma.medicalRecord.count({ where: { [column]: BigInt(value) } as any });
      },
    };
  }

  private path(req: Request) {
    return `${req.protocol}://${req.get('host')}${req.path}`;
  }

  // ─── Medical records ──────────────────────────────────────────────────────

  @Get('records')
  async records(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const where: Prisma.MedicalRecordWhereInput = { familyId: user.familyId! };
    if (filled(query.member_name)) where.memberName = like(query.member_name);
    if (filled(query.type)) where.type = query.type;

    const page = pageFrom(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.medicalRecord.findMany({
        where,
        include: { user: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    return success(paginate(rows.map(presentMedicalRecord), total, page, PER_PAGE, this.path(req)));
  }

  @Post('records')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file'))
  async storeRecord(
    @Body() body: any,
    @UploadedFile() file: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    await validate({ ...body, file }, {
      member_name: 'required|string|max:255',
      type: 'required|in:record,prescription,report,vaccination',
      title: 'required|string|max:255',
      doctor_name: 'nullable|string|max:255',
      hospital_name: 'nullable|string|max:255',
      date: 'required|date',
      diagnosis: 'nullable|string',
      notes: 'nullable|string',
      file: 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png',
    });

    const now = new Date();
    const data: Prisma.MedicalRecordUncheckedCreateInput = {
      ...(pick(body, {
        member_name: ['memberName'],
        type: ['type'],
        title: ['title'],
        doctor_name: ['doctorName'],
        hospital_name: ['hospitalName'],
        date: ['date', 'date'],
        diagnosis: ['diagnosis'],
        notes: ['notes'],
      }) as any),
      familyId: user.familyId!,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    };

    if (file) {
      data.filePath = await this.storage.store(file, 'medical');
      data.fileName = file.originalname;
    }

    const record = await this.prisma.medicalRecord.create({ data, include: { user: true } });

    await this.activity.log(
      user.id, user.familyId!, 'medical', 'created',
      `Added medical record: ${record.title} for ${record.memberName}`,
    );

    return success(presentMedicalRecord(record), 'Medical record added');
  }

  @Get('records/:id')
  async showRecord(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { user: true, medicines: true },
    });
    if (!record) throw new NotFoundException('Record not found');

    return success(presentMedicalRecord(record));
  }

  @Post('records/:id')
  @UseInterceptors(FileInterceptor('file'))
  async updateRecord(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const existing = await this.prisma.medicalRecord.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!existing) throw new NotFoundException('Record not found');

    const data: Prisma.MedicalRecordUncheckedUpdateInput = {
      ...(pick(body, {
        member_name: ['memberName'],
        type: ['type'],
        title: ['title'],
        doctor_name: ['doctorName'],
        hospital_name: ['hospitalName'],
        date: ['date', 'date'],
        diagnosis: ['diagnosis'],
        notes: ['notes'],
      }) as any),
      updatedAt: new Date(),
    };

    if (file) {
      await this.storage.delete(existing.filePath);
      data.filePath = await this.storage.store(file, 'medical');
      data.fileName = file.originalname;
    }

    const record = await this.prisma.medicalRecord.update({
      where: { id: existing.id },
      data,
      include: { user: true },
    });

    return success(presentMedicalRecord(record), 'Medical record updated');
  }

  @Delete('records/:id')
  async destroyRecord(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const record = await this.prisma.medicalRecord.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!record) throw new NotFoundException('Record not found');

    await this.storage.delete(record.filePath);
    await this.prisma.medicalRecord.delete({ where: { id: record.id } });

    return success(null, 'Medical record deleted');
  }

  // ─── Medicines ────────────────────────────────────────────────────────────

  @Get('medicines')
  async medicines(@Query() query: any, @CurrentUser() user: AuthUser) {
    const where: Prisma.MedicineWhereInput = { familyId: user.familyId! };
    if (filled(query.member_name)) where.memberName = like(query.member_name);
    // Laravel tested `!== null`, so `?is_active=0` filters to inactive.
    if (query.is_active !== undefined && query.is_active !== null) {
      where.isActive = toBool(query.is_active);
    }

    const rows = await this.prisma.medicine.findMany({ where, orderBy: { createdAt: 'desc' } });

    return success(rows.map(presentMedicine));
  }

  @Post('medicines')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('image'))
  async storeMedicine(
    @Body() body: any,
    @UploadedFile() image: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    await validate({ ...body, image }, {
      member_name: 'required|string|max:255',
      name: 'required|string|max:255',
      dosage: 'nullable|string|max:100',
      frequency: 'nullable|string|max:100',
      start_date: 'nullable|date',
      end_date: 'nullable|date|after_or_equal:start_date',
      medical_record_id: 'nullable|exists:medical_records,id',
      image: 'nullable|file|max:5120|mimes:jpg,jpeg,png,webp',
      notify_on_completion: 'nullable|boolean',
    }, this.recordsCtx());

    const now = new Date();
    const data: Prisma.MedicineUncheckedCreateInput = {
      ...(pick(body, {
        member_name: ['memberName'],
        name: ['name'],
        dosage: ['dosage'],
        frequency: ['frequency'],
        start_date: ['startDate', 'date'],
        end_date: ['endDate', 'date'],
        notes: ['notes'],
      }) as any),
      medicalRecordId: toBigInt(body.medical_record_id),
      familyId: user.familyId!,
      notifyOnCompletion: toBool(body.notify_on_completion),
      createdAt: now,
      updatedAt: now,
    };

    if (image) data.imagePath = await this.storage.store(image, 'medicines');

    const medicine = await this.prisma.medicine.create({ data });

    return success(presentMedicine(medicine), 'Medicine added');
  }

  @Post('medicines/:id')
  @UseInterceptors(FileInterceptor('image'))
  async updateMedicine(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() image: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const existing = await this.prisma.medicine.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!existing) throw new NotFoundException('Medicine not found');

    // Laravel used `$request->boolean(...)` here unconditionally, so an omitted
    // flag is written as false rather than left alone. Preserved deliberately.
    const data: Prisma.MedicineUncheckedUpdateInput = {
      ...(pick(body, {
        member_name: ['memberName'],
        name: ['name'],
        dosage: ['dosage'],
        frequency: ['frequency'],
        start_date: ['startDate', 'date'],
        end_date: ['endDate', 'date'],
        notes: ['notes'],
      }) as any),
      isActive: toBool(body.is_active),
      notifyOnCompletion: toBool(body.notify_on_completion),
      updatedAt: new Date(),
    };

    if (image) {
      await this.storage.delete(existing.imagePath);
      data.imagePath = await this.storage.store(image, 'medicines');
    }

    const medicine = await this.prisma.medicine.update({ where: { id: existing.id }, data });

    return success(presentMedicine(medicine), 'Medicine updated');
  }

  @Delete('medicines/:id')
  async destroyMedicine(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const medicine = await this.prisma.medicine.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!medicine) throw new NotFoundException('Medicine not found');

    await this.storage.delete(medicine.imagePath);
    await this.prisma.medicine.delete({ where: { id: medicine.id } });

    return success(null, 'Medicine deleted');
  }

  // ─── Appointments ─────────────────────────────────────────────────────────

  @Get('appointments')
  async appointments(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const where: Prisma.AppointmentWhereInput = { familyId: user.familyId! };
    if (filled(query.status)) where.status = query.status;

    let orderBy: Prisma.AppointmentOrderByWithRelationInput[] = [{ date: 'desc' }];
    if (filled(query.upcoming)) {
      where.date = { gte: today() };
      orderBy = [{ date: 'asc' }, { time: 'asc' }];
    }

    const page = pageFrom(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: { user: true },
        orderBy,
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return success(paginate(rows.map(presentAppointment), total, page, PER_PAGE, this.path(req)));
  }

  @Post('appointments')
  @HttpCode(201)
  async storeAppointment(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      member_name: 'required|string|max:255',
      doctor_name: 'required|string|max:255',
      specialty: 'nullable|string|max:100',
      date: 'required|date',
      time: 'nullable|date_format:H:i,H:i:s',
      location: 'nullable|string|max:255',
      notes: 'nullable|string',
      remind_days_before: 'nullable|integer|min:0|max:365',
    });

    const now = new Date();
    const appointment = await this.prisma.appointment.create({
      data: {
        ...(pick(body, {
          member_name: ['memberName'],
          doctor_name: ['doctorName'],
          specialty: ['specialty'],
          date: ['date', 'date'],
          time: ['time', 'time'],
          location: ['location'],
          notes: ['notes'],
          remind_days_before: ['remindDaysBefore', 'int'],
        }) as any),
        familyId: user.familyId!,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    await this.activity.log(
      user.id, user.familyId!, 'medical', 'appointment_created',
      `Appointment with Dr. ${appointment.doctorName} for ${appointment.memberName}`,
    );

    return success(presentAppointment(appointment), 'Appointment scheduled');
  }

  @Put('appointments/:id')
  async updateAppointment(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: AuthUser,
  ) {
    const existing = await this.prisma.appointment.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!existing) throw new NotFoundException('Appointment not found');

    const appointment = await this.prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...pick(body, {
          member_name: ['memberName'],
          doctor_name: ['doctorName'],
          specialty: ['specialty'],
          date: ['date', 'date'],
          time: ['time', 'time'],
          location: ['location'],
          notes: ['notes'],
          status: ['status'],
          remind_days_before: ['remindDaysBefore', 'int'],
        }),
        updatedAt: new Date(),
      },
    });

    return success(presentAppointment(appointment), 'Appointment updated');
  }

  @Delete('appointments/:id')
  async destroyAppointment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    await this.prisma.appointment.delete({ where: { id: appointment.id } });

    return success(null, 'Appointment deleted');
  }
}
