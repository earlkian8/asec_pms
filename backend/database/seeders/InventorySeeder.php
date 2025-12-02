<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating inventory items...');
        $inventoryItems = $this->createInventoryItems(20);
        $this->command->info("Created {$inventoryItems->count()} inventory items");
        
        $this->command->info('Creating initial stock transactions...');
        $this->createInitialTransactions($inventoryItems);
        $this->command->info('Initial stock transactions created');
    }

    private function createInventoryItems($count)
    {
        $categories = [
            'Construction Materials' => ['Cement', 'Steel Bars', 'Gravel', 'Sand', 'Rebar', 'Concrete Mix', 'Bricks', 'Blocks'],
            'Electrical' => ['Wires', 'Switches', 'Outlets', 'Circuit Breakers', 'Cables', 'Conduits', 'Fuses'],
            'Plumbing' => ['Pipes', 'Fittings', 'Valves', 'Faucets', 'Water Meters', 'PVC Pipes', 'Copper Pipes'],
            'Tools & Equipment' => ['Drill', 'Hammer', 'Saw', 'Wrench', 'Screwdriver', 'Level', 'Measuring Tape'],
            'Safety Equipment' => ['Hard Hat', 'Safety Vest', 'Gloves', 'Boots', 'Goggles', 'Mask', 'Harness'],
            'Office Supplies' => ['Paper', 'Pens', 'Folders', 'Binders', 'Stapler', 'Printer Ink'],
        ];

        $units = ['pieces', 'kg', 'meters', 'liters', 'boxes', 'rolls', 'units', 'packs', 'sets'];

        $inventoryItems = collect();
        $itemIndex = 1;

        foreach ($categories as $category => $items) {
            foreach ($items as $itemName) {
                if ($itemIndex > $count) break 2;

                do {
                    $random = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                    $itemCode = 'INV-' . $random;
                } while (InventoryItem::where('item_code', $itemCode)->exists());

                $unit = fake()->randomElement($units);
                $minStock = fake()->randomFloat(2, 10, 100);
                $currentStock = fake()->randomFloat(2, $minStock * 1.5, $minStock * 10);
                $unitPrice = fake()->randomFloat(2, 50, 5000);

                $inventoryItems->push(InventoryItem::create([
                    'item_code' => $itemCode,
                    'item_name' => $itemName,
                    'description' => fake()->optional(0.7)->sentence(),
                    'category' => $category,
                    'unit_of_measure' => $unit,
                    'current_stock' => $currentStock,
                    'min_stock_level' => $minStock,
                    'unit_price' => $unitPrice,
                    'is_active' => fake()->boolean(90),
                    'created_by' => User::inRandomOrder()->first()?->id,
                ]));

                $itemIndex++;
            }
        }

        // Fill remaining slots with random items
        while ($inventoryItems->count() < $count) {
            do {
                $random = str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                $itemCode = 'INV-' . $random;
            } while (InventoryItem::where('item_code', $itemCode)->exists());

            $unit = fake()->randomElement($units);
            $minStock = fake()->randomFloat(2, 10, 100);
            $currentStock = fake()->randomFloat(2, $minStock * 1.5, $minStock * 10);
            $unitPrice = fake()->randomFloat(2, 50, 5000);

            $inventoryItems->push(InventoryItem::create([
                'item_code' => $itemCode,
                'item_name' => fake()->words(2, true),
                'description' => fake()->optional(0.7)->sentence(),
                'category' => fake()->randomElement(array_keys($categories)),
                'unit_of_measure' => $unit,
                'current_stock' => $currentStock,
                'min_stock_level' => $minStock,
                'unit_price' => $unitPrice,
                'is_active' => fake()->boolean(90),
                'created_by' => User::inRandomOrder()->first()?->id,
            ]));
        }

        return $inventoryItems;
    }

    private function createInitialTransactions($inventoryItems)
    {
        $users = User::all();
        if ($users->isEmpty()) {
            return;
        }

        foreach ($inventoryItems as $item) {
            // Create a stock_in transaction matching the current_stock value
            // This ensures the calculated stock matches the seeded current_stock
            if ($item->current_stock > 0) {
                InventoryTransaction::create([
                    'inventory_item_id' => $item->id,
                    'transaction_type' => 'stock_in',
                    'quantity' => $item->current_stock,
                    'unit_price' => $item->unit_price,
                    'transaction_date' => fake()->dateTimeBetween('-6 months', '-1 day'),
                    'notes' => 'Initial stock from seeder',
                    'created_by' => $users->random()->id,
                ]);
            }
        }

        // Recalculate stock for all items to ensure consistency
        foreach ($inventoryItems as $item) {
            $item->refresh();
            $calculatedStock = $item->calculateCurrentStock();
            $item->update(['current_stock' => $calculatedStock]);
        }
    }
}

