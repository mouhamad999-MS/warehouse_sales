<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreUserRequest;
use App\Http\Requests\Api\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->latest()->paginate(20);
        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        $role = Role::findByName($request->role, 'web');
        $user->assignRole($role);
        $user->update(['role_id' => $role->id]);

        return new UserResource($user->load('roles'));
    }

    public function show(User $user)
    {
        return new UserResource($user->load('roles'));
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $data = $request->validated();

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
            $role = Role::findByName($data['role'], 'web');
            $data['role_id'] = $role->id;
            unset($data['role']);
        }

        $user->update($data);
        return new UserResource($user->load('roles'));
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }

    public function toggleActive(User $user)
    {
        $user->update(['is_active' => ! $user->is_active]);
        return new UserResource($user->load('roles'));
    }

    public function resetPassword(Request $request, User $user)
    {
        $request->validate([
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
        ]);

        $user->update(['password' => Hash::make($request->password)]);
        // Revoke all tokens so the user must log in with the new password
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function uploadAvatar(Request $request, User $user)
    {
        $request->validate(['avatar' => 'required|image|mimes:jpeg,png,webp|max:2048']);

        if ($user->avatar_url) {
            Storage::disk('public')->delete($user->avatar_url);
        }

        $path = $request->file('avatar')->store('avatars/users', 'public');
        $user->update(['avatar_url' => $path]);

        return new UserResource($user->load('roles'));
    }

    public function removeAvatar(User $user)
    {
        if ($user->avatar_url) {
            Storage::disk('public')->delete($user->avatar_url);
            $user->update(['avatar_url' => null]);
        }

        return new UserResource($user->load('roles'));
    }
}
