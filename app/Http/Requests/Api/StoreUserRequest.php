<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
            'role' => 'required|in:admin,warehouse_manager,sales_officer',
            'is_active' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'password.min'   => 'The password must be at least 8 characters long.',
            'password.regex' => 'The password must contain at least one uppercase letter (A–Z) and one number (0–9).',
        ];
    }
}
