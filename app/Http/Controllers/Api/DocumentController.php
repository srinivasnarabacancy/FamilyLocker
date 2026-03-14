<?php

namespace App\Http\Controllers\Api;

use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class DocumentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Document::where('family_id', $request->user()->family_id)
            ->with('uploader');

        if ($request->type) {
            $query->where('type', $request->type);
        }
        if ($request->member_name) {
            $query->where('member_name', 'like', "%{$request->member_name}%");
        }
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                  ->orWhere('document_number', 'like', "%{$request->search}%")
                  ->orWhere('member_name', 'like', "%{$request->search}%");
            });
        }

        $documents = $query->orderBy('created_at', 'desc')->paginate(15);

        return $this->successResponse($documents);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'type' => 'required|string|in:aadhaar,pan,passport,driving_license,birth_certificate,voter_id,other',
            'member_name' => 'required|string|max:255',
            'document_number' => 'nullable|string|max:100',
            'issue_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after_or_equal:issue_date',
            'notes' => 'nullable|string',
            'is_reminder_enabled' => 'boolean',
            'reminder_days_before' => 'integer|min:1|max:365',
            'file' => 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->only([
            'title', 'type', 'member_name', 'document_number',
            'issue_date', 'expiry_date', 'notes', 'is_reminder_enabled', 'reminder_days_before',
        ]);

        $data['family_id'] = $request->user()->family_id;
        $data['uploaded_by'] = $request->user()->id;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('documents', 'public');
            $data['file_path'] = $path;
            $data['file_name'] = $file->getClientOriginalName();
        }

        $document = Document::create($data);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'documents', 'created', "Added document: {$document->title}"
        );

        return $this->successResponse($document->load('uploader'), 'Document added successfully', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $document = Document::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with('uploader')
            ->first();

        if (!$document) {
            return $this->errorResponse('Document not found', 404);
        }

        return $this->successResponse($document);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $document = Document::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$document) {
            return $this->errorResponse('Document not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:aadhaar,pan,passport,driving_license,birth_certificate,voter_id,other',
            'member_name' => 'sometimes|string|max:255',
            'document_number' => 'nullable|string|max:100',
            'issue_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'is_reminder_enabled' => 'boolean',
            'reminder_days_before' => 'integer|min:1|max:365',
            'file' => 'nullable|file|max:10240|mimes:pdf,jpg,jpeg,png',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->only([
            'title', 'type', 'member_name', 'document_number',
            'issue_date', 'expiry_date', 'notes', 'is_reminder_enabled', 'reminder_days_before',
        ]);

        if ($request->hasFile('file')) {
            if ($document->file_path) {
                Storage::disk('public')->delete($document->file_path);
            }
            $file = $request->file('file');
            $data['file_path'] = $file->store('documents', 'public');
            $data['file_name'] = $file->getClientOriginalName();
        }

        $document->update($data);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'documents', 'updated', "Updated document: {$document->title}"
        );

        return $this->successResponse($document->fresh()->load('uploader'), 'Document updated successfully');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $document = Document::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$document) {
            return $this->errorResponse('Document not found', 404);
        }

        if ($document->file_path) {
            Storage::disk('public')->delete($document->file_path);
        }

        $title = $document->title;
        $document->delete();

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'documents', 'deleted', "Deleted document: {$title}"
        );

        return $this->successResponse(null, 'Document deleted successfully');
    }

    public function expiring(Request $request): JsonResponse
    {
        $days = $request->days ?? 30;

        $documents = Document::where('family_id', $request->user()->family_id)
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', now())
            ->whereDate('expiry_date', '<=', now()->addDays($days))
            ->orderBy('expiry_date')
            ->get();

        return $this->successResponse($documents);
    }
}
