<?php

namespace App\Models;

use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, MustVerifyEmailTrait;

    public const ROLE_OWNER = 'owner';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_MEMBER = 'member';
    public const ROLE_CAREGIVER = 'caregiver';
    public const ROLE_FINANCE_MANAGER = 'finance_manager';
    public const ROLE_VIEWER = 'viewer';

    public const ROLE_LABELS = [
        self::ROLE_OWNER => 'Owner',
        self::ROLE_ADMIN => 'Admin',
        self::ROLE_MEMBER => 'Member',
        self::ROLE_CAREGIVER => 'Caregiver',
        self::ROLE_FINANCE_MANAGER => 'Finance Manager',
        self::ROLE_VIEWER => 'Viewer',
    ];

    public const FAMILY_MANAGER_ROLES = [
        self::ROLE_OWNER,
        self::ROLE_ADMIN,
    ];

    public const INVITABLE_ROLES = [
        self::ROLE_MEMBER,
        self::ROLE_ADMIN,
        self::ROLE_CAREGIVER,
        self::ROLE_FINANCE_MANAGER,
        self::ROLE_VIEWER,
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'family_id',
        'role',
        'avatar',
        'phone',
        'date_of_birth',
        'relation',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
        ];
    }

    public function family()
    {
        return $this->belongsTo(Family::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public static function invitableRoles(): array
    {
        return self::INVITABLE_ROLES;
    }

    public static function canManageFamilyRole(?string $role): bool
    {
        return in_array($role, self::FAMILY_MANAGER_ROLES, true);
    }

    public function canManageFamily(): bool
    {
        return self::canManageFamilyRole($this->role);
    }

    public static function roleLabel(?string $role): string
    {
        if (!$role) {
            return self::ROLE_LABELS[self::ROLE_MEMBER];
        }

        return self::ROLE_LABELS[$role] ?? Str::of($role)->replace('_', ' ')->title()->toString();
    }

    public function hasVerifiedEmail(): bool
    {
        return blank($this->email) || ! is_null($this->email_verified_at);
    }

    public function sendEmailVerificationNotification(): void
    {
        if (blank($this->email) || $this->hasVerifiedEmail()) {
            return;
        }

        $this->notify(new VerifyEmail());
    }
}
