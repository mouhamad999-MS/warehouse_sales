<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;
        return [
            'name' => 'sometimes|required|string|max:255',
            'email' => "sometimes|required|email|unique:users,email,{$userId}",
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
            'role' => 'sometimes|required|in:admin,warehouse_manager,sales_officer',
            'is_active' => 'sometimes|boolean',
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
