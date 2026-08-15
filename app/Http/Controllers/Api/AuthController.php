<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        // If 2FA is enabled, issue a short-lived pending token instead of a full session
        if ($user->totp_enabled_at) {
            $pendingToken = Str::random(40);
            Cache::put("2fa_pending:{$pendingToken}", $user->id, now()->addMinutes(5));

            return response()->json([
                'requires_2fa'  => true,
                'pending_token' => $pendingToken,
            ]);
        }

        return $this->issueSession($user);
    }

    public function verify2fa(Request $request, TotpService $totp)
    {
        $request->validate([
            'pending_token' => 'required|string',
            'code'          => 'required|string|size:6',
        ]);

        $userId = Cache::get("2fa_pending:{$request->pending_token}");

        if (! $userId) {
            throw ValidationException::withMessages([
                'code' => ['Session expired. Please log in again.'],
            ]);
        }

        $user = User::findOrFail($userId);

        if (! $totp->verify($user->totp_secret, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        Cache::forget("2fa_pending:{$request->pending_token}");

        return $this->issueSession($user);
    }

    public function setup2fa(Request $request, TotpService $totp)
    {
        $user   = $request->user();
        $secret = $totp->generateSecret();

        Cache::put("2fa_setup:{$user->id}", $secret, now()->addMinutes(15));

        return response()->json([
            'secret' => $secret,
            'qr_uri' => $totp->getQrUri($user->email, $secret),
        ]);
    }

    public function enable2fa(Request $request, TotpService $totp)
    {
        $request->validate(['code' => 'required|string|size:6']);

        $user   = $request->user();
        $secret = Cache::get("2fa_setup:{$user->id}");

        if (! $secret) {
            return response()->json(['message' => 'Setup session expired. Please restart.'], 422);
        }

        if (! $totp->verify($secret, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid code. Please try again.'],
            ]);
        }

        $user->update([
            'totp_secret'     => $secret,
            'totp_enabled_at' => now(),
        ]);
        Cache::forget("2fa_setup:{$user->id}");

        return response()->json(['message' => 'Two-factor authentication enabled.']);
    }

    public function disable2fa(Request $request, TotpService $totp)
    {
        $request->validate([
            'password' => 'required|string',
            'code'     => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        if (! $totp->verify($user->totp_secret, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['Invalid authentication code.'],
            ]);
        }

        $user->update([
            'totp_secret'     => null,
            'totp_enabled_at' => null,
        ]);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully'])
            ->withoutCookie('auth_token');
    }

    public function user(Request $request)
    {
        return new UserResource($request->user()->load('roles'));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name'             => 'required|string|max:255',
            'email'            => "required|email|unique:users,email,{$user->id}",
            'current_password' => 'nullable|required_with:new_password|string',
            'new_password'     => 'nullable|string|min:8|regex:/[A-Z]/|regex:/[0-9]/',
        ]);

        if ($request->filled('current_password')) {
            if (! Hash::check($request->current_password, $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['Current password is incorrect.'],
                ]);
            }
            $user->password = Hash::make($request->new_password);
        }

        $user->name  = $request->name;
        $user->email = $request->email;
        $user->save();

        return new UserResource($user->load('roles'));
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate(['avatar' => 'required|image|mimes:jpeg,png,webp|max:2048']);

        $user = $request->user();

        if ($user->avatar_url) {
            Storage::disk('public')->delete($user->avatar_url);
        }

        $path = $request->file('avatar')->store('avatars/users', 'public');
        $user->update(['avatar_url' => $path]);

        return new UserResource($user->load('roles'));
    }

    public function removeAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_url) {
            Storage::disk('public')->delete($user->avatar_url);
            $user->update(['avatar_url' => null]);
        }

        return new UserResource($user->load('roles'));
    }

    private function issueSession(User $user)
    {
        $token  = $user->createToken('api-token')->plainTextToken;
        $cookie = cookie(
            'auth_token',
            $token,
            config('sanctum.expiration', 480),
            '/',
            null,
            app()->isProduction(),
            true,
            false,
            'Strict'
        );

        return response()->json([
            'user' => new UserResource($user->load('roles')),
        ])->withCookie($cookie);
    }
}
