<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CustomerController extends Controller
{
    public function index()
    {
        return CustomerResource::collection(Customer::with('createdBy')->latest()->paginate(20));
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
        ]);

        $customer = Customer::create([
            ...$request->only('name', 'email', 'phone', 'address'),
            'created_by' => $request->user()->id,
        ]);

        return new CustomerResource($customer->load('createdBy'));
    }

    public function show(Customer $customer)
    {
        return new CustomerResource($customer->load('salesOrders', 'createdBy'));
    }

    public function update(Request $request, Customer $customer)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => "required|email|unique:customers,email,{$customer->id}",
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string',
        ]);

        $customer->update($request->only('name', 'email', 'phone', 'address'));
        return new CustomerResource($customer);
    }

    public function uploadAvatar(Request $request, Customer $customer)
    {
        $request->validate(['avatar' => 'required|image|mimes:jpeg,png,webp|max:2048']);

        if ($customer->avatar_url) {
            Storage::disk('public')->delete($customer->avatar_url);
        }

        $path = $request->file('avatar')->store('avatars/customers', 'public');
        $customer->update(['avatar_url' => $path]);

        return new CustomerResource($customer);
    }

    public function removeAvatar(Customer $customer)
    {
        if ($customer->avatar_url) {
            Storage::disk('public')->delete($customer->avatar_url);
            $customer->update(['avatar_url' => null]);
        }

        return new CustomerResource($customer);
    }
}
