<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\MeasurementUnit;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'sku' => fake()->unique()->bothify('SKU-####'),
            'category_id' => Category::factory(),
            'unit_id' => MeasurementUnit::factory(),
            'quantity' => fake()->numberBetween(10, 100),
            'min_stock_level' => fake()->numberBetween(1, 10),
            'unit_price' => fake()->randomFloat(2, 1, 500),
            'description' => fake()->sentence(),
        ];
    }
}
