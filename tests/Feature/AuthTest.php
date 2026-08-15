<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);
    }

    public function test_login_returns_token_for_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email'     => 'test@example.com',
            'password'  => bcrypt('Password1'),
            'is_active' => true,
        ]);
        $user->assignRole('admin');

        $response = $this->postJson('/api/login', [
            'email'    => 'test@example.com',
            'password' => 'Password1',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['user'])
                 ->assertCookieNotExpired('auth_token');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create([
            'email'    => 'test@example.com',
            'password' => bcrypt('Password1'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'test@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        User::factory()->create([
            'email'     => 'inactive@example.com',
            'password'  => bcrypt('Password1'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'email'    => 'inactive@example.com',
            'password' => 'Password1',
        ]);

        $response->assertStatus(422);
    }

    public function test_authenticated_user_can_access_user_endpoint(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('admin');
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/user');

        $response->assertStatus(200)
                 ->assertJsonPath('data.email', $user->email);
    }

    public function test_logout_deletes_token(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('admin');
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')
             ->assertStatus(200);

        // Token is deleted in DB
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_is_throttled_after_five_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'x@x.com', 'password' => 'bad']);
        }

        $response = $this->postJson('/api/login', ['email' => 'x@x.com', 'password' => 'bad']);
        $response->assertStatus(429);
    }
}
