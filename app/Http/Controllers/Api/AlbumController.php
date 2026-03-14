<?php

namespace App\Http\Controllers\Api;

use App\Models\Album;
use App\Models\Photo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class AlbumController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $albums = Album::where('family_id', $request->user()->family_id)
            ->withCount('photos')
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(12);

        return $this->successResponse($albums);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $album = Album::create([
            ...$request->only(['name', 'description']),
            'family_id' => $request->user()->family_id,
            'user_id' => $request->user()->id,
        ]);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'albums', 'created', "Created album: {$album->name}"
        );

        return $this->successResponse($album, 'Album created', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $album = Album::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with(['user', 'photos'])
            ->first();

        return $album ? $this->successResponse($album) : $this->errorResponse('Album not found', 404);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $album = Album::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$album) {
            return $this->errorResponse('Album not found', 404);
        }

        $album->update($request->only(['name', 'description']));

        return $this->successResponse($album->fresh(), 'Album updated');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $album = Album::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$album) {
            return $this->errorResponse('Album not found', 404);
        }

        // Delete all photos from storage
        foreach ($album->photos as $photo) {
            Storage::disk('public')->delete($photo->file_path);
        }

        $album->delete();

        return $this->successResponse(null, 'Album deleted');
    }

    // Photos
    public function uploadPhotos(Request $request, int $albumId): JsonResponse
    {
        $album = Album::where('id', $albumId)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$album) {
            return $this->errorResponse('Album not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'photos' => 'required|array|min:1',
            'photos.*' => 'required|file|mimes:jpg,jpeg,png,gif,webp|max:20480',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $uploaded = [];
        foreach ($request->file('photos') as $file) {
            $path = $file->store("albums/{$albumId}", 'public');
            $photo = Photo::create([
                'album_id' => $albumId,
                'user_id' => $request->user()->id,
                'file_path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
            ]);
            $uploaded[] = $photo;
        }

        // Set cover photo if album doesn't have one
        if (!$album->cover_photo && count($uploaded) > 0) {
            $album->update(['cover_photo' => $uploaded[0]->file_path]);
        }

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'albums', 'photos_uploaded', "Uploaded " . count($uploaded) . " photos to {$album->name}"
        );

        return $this->successResponse($uploaded, count($uploaded) . ' photo(s) uploaded', 201);
    }

    public function deletePhoto(Request $request, int $photoId): JsonResponse
    {
        $photo = Photo::whereHas('album', function ($q) use ($request) {
            $q->where('family_id', $request->user()->family_id);
        })->find($photoId);

        if (!$photo) {
            return $this->errorResponse('Photo not found', 404);
        }

        Storage::disk('public')->delete($photo->file_path);
        $photo->delete();

        return $this->successResponse(null, 'Photo deleted');
    }

    public function setCover(Request $request, int $albumId, int $photoId): JsonResponse
    {
        $album = Album::where('id', $albumId)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$album) {
            return $this->errorResponse('Album not found', 404);
        }

        $photo = Photo::where('id', $photoId)->where('album_id', $albumId)->first();

        if (!$photo) {
            return $this->errorResponse('Photo not found', 404);
        }

        $album->update(['cover_photo' => $photo->file_path]);

        return $this->successResponse(null, 'Cover photo set');
    }
}
