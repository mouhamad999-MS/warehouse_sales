<?php

namespace App\Models\Concerns;

use Illuminate\Validation\ValidationException;

trait HasStatusTransitions
{
    public function canTransitionTo(string $status): bool
    {
        return in_array($status, static::TRANSITIONS[$this->status] ?? []);
    }

    /**
     * Transition to a new status or throw a 422 ValidationException.
     *
     * @param  array<string, mixed>  $extra  Additional columns to update atomically (e.g. approved_by)
     */
    public function transitionTo(string $status, array $extra = []): void
    {
        if (! $this->canTransitionTo($status)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition from {$this->status} to {$status}."],
            ]);
        }

        $this->update(array_merge(['status' => $status], $extra));
    }
}
