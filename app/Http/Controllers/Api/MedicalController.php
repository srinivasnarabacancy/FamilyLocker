<?php

namespace App\Http\Controllers\Api;

use App\Models\Appointment;
use App\Models\MedicalRecord;
use App\Models\Medicine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MedicalController extends BaseApiController
{
    // Medical Records
    public function records(Request $request): JsonResponse
    {
        $query = MedicalRecord::where('family_id', $request->user()->family_id)
            ->with('user');

        if ($request->member_name) {
            $query->where('member_name', 'like', "%{$request->member_name}%");
        }
        if ($request->type) {
            $query->where('type', $request->type);
        }

        return $this->successResponse($query->orderBy('date', 'desc')->paginate(15));
    }

    public function storeRecord(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'member_name' => 'required|string|max:255',
            'type' => 'required|in:record,prescription,report,vaccination',
            'title' => 'required|string|max:255',
            'doctor_name' => 'nullable|string|max:255',
            'hospital_name' => 'nullable|string|max:255',
            'date' => 'required|date',
            'diagnosis' => 'nullable|string',
            'notes' => 'nullable|string',
            'file' => 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->only(['member_name', 'type', 'title', 'doctor_name', 'hospital_name', 'date', 'diagnosis', 'notes']);
        $data['family_id'] = $request->user()->family_id;
        $data['user_id'] = $request->user()->id;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $data['file_path'] = $file->store('medical', 'public');
            $data['file_name'] = $file->getClientOriginalName();
        }

        $record = MedicalRecord::create($data);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'medical', 'created', "Added medical record: {$record->title} for {$record->member_name}"
        );

        return $this->successResponse($record->load('user'), 'Medical record added', 201);
    }

    public function showRecord(Request $request, int $id): JsonResponse
    {
        $record = MedicalRecord::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with(['user', 'medicines'])
            ->first();

        return $record ? $this->successResponse($record) : $this->errorResponse('Record not found', 404);
    }

    public function updateRecord(Request $request, int $id): JsonResponse
    {
        $record = MedicalRecord::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$record) {
            return $this->errorResponse('Record not found', 404);
        }

        $data = $request->only(['member_name', 'type', 'title', 'doctor_name', 'hospital_name', 'date', 'diagnosis', 'notes']);

        if ($request->hasFile('file')) {
            if ($record->file_path) Storage::disk('public')->delete($record->file_path);
            $file = $request->file('file');
            $data['file_path'] = $file->store('medical', 'public');
            $data['file_name'] = $file->getClientOriginalName();
        }

        $record->update($data);

        return $this->successResponse($record->fresh()->load('user'), 'Medical record updated');
    }

    public function destroyRecord(Request $request, int $id): JsonResponse
    {
        $record = MedicalRecord::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$record) {
            return $this->errorResponse('Record not found', 404);
        }

        if ($record->file_path) Storage::disk('public')->delete($record->file_path);
        $record->delete();

        return $this->successResponse(null, 'Medical record deleted');
    }

    // Medicines
    public function medicines(Request $request): JsonResponse
    {
        $query = Medicine::where('family_id', $request->user()->family_id);

        if ($request->member_name) {
            $query->where('member_name', 'like', "%{$request->member_name}%");
        }
        if ($request->is_active !== null) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return $this->successResponse($query->orderBy('created_at', 'desc')->get());
    }

    public function storeMedicine(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'member_name'          => 'required|string|max:255',
            'name'                 => 'required|string|max:255',
            'dosage'               => 'nullable|string|max:100',
            'frequency'            => 'nullable|string|max:100',
            'start_date'           => 'nullable|date',
            'end_date'             => 'nullable|date|after_or_equal:start_date',
            'medical_record_id'    => 'nullable|exists:medical_records,id',
            'image'                => 'nullable|file|max:5120|mimes:jpg,jpeg,png,webp',
            'notify_on_completion' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->only(['member_name', 'name', 'dosage', 'frequency', 'start_date', 'end_date', 'notes', 'medical_record_id']);
        $data['family_id']            = $request->user()->family_id;
        $data['notify_on_completion'] = $request->boolean('notify_on_completion');

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('medicines', 'public');
        }

        $medicine = Medicine::create($data);

        return $this->successResponse($medicine, 'Medicine added', 201);
    }

    public function updateMedicine(Request $request, int $id): JsonResponse
    {
        $medicine = Medicine::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$medicine) {
            return $this->errorResponse('Medicine not found', 404);
        }

        $data = $request->only(['member_name', 'name', 'dosage', 'frequency', 'start_date', 'end_date', 'notes']);
        $data['is_active']            = $request->boolean('is_active');
        $data['notify_on_completion'] = $request->boolean('notify_on_completion');

        if ($request->hasFile('image')) {
            if ($medicine->image_path) Storage::disk('public')->delete($medicine->image_path);
            $data['image_path'] = $request->file('image')->store('medicines', 'public');
        }

        $medicine->update($data);

        return $this->successResponse($medicine->fresh(), 'Medicine updated');
    }

    public function destroyMedicine(Request $request, int $id): JsonResponse
    {
        $medicine = Medicine::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$medicine) {
            return $this->errorResponse('Medicine not found', 404);
        }

        if ($medicine->image_path) Storage::disk('public')->delete($medicine->image_path);
        $medicine->delete();

        return $this->successResponse(null, 'Medicine deleted');
    }

    // Appointments
    public function appointments(Request $request): JsonResponse
    {
        $query = Appointment::where('family_id', $request->user()->family_id)
            ->with('user');

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->upcoming) {
            $query->whereDate('date', '>=', now())->orderBy('date')->orderBy('time');
        } else {
            $query->orderBy('date', 'desc');
        }

        return $this->successResponse($query->paginate(15));
    }

    public function storeAppointment(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'member_name'        => 'required|string|max:255',
            'doctor_name'        => 'required|string|max:255',
            'specialty'          => 'nullable|string|max:100',
            'date'               => 'required|date',
            'time'               => 'nullable|date_format:H:i,H:i:s',
            'location'           => 'nullable|string|max:255',
            'notes'              => 'nullable|string',
            'remind_days_before' => 'nullable|integer|min:0|max:365',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $appointment = Appointment::create([
            ...$request->only(['member_name', 'doctor_name', 'specialty', 'date', 'time', 'location', 'notes', 'remind_days_before']),
            'family_id' => $request->user()->family_id,
            'user_id'   => $request->user()->id,
        ]);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'medical', 'appointment_created', "Appointment with Dr. {$appointment->doctor_name} for {$appointment->member_name}"
        );

        return $this->successResponse($appointment, 'Appointment scheduled', 201);
    }

    public function updateAppointment(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$appointment) {
            return $this->errorResponse('Appointment not found', 404);
        }

        $appointment->update($request->only(['member_name', 'doctor_name', 'specialty', 'date', 'time', 'location', 'notes', 'status', 'remind_days_before']));

        return $this->successResponse($appointment->fresh(), 'Appointment updated');
    }

    public function destroyAppointment(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$appointment) {
            return $this->errorResponse('Appointment not found', 404);
        }

        $appointment->delete();

        return $this->successResponse(null, 'Appointment deleted');
    }
}
