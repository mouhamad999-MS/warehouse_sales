<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class MeasurementUnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'abbreviation' => fake()->unique()->lexify('??'),
        ];
    }
}
