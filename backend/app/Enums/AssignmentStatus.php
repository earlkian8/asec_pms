<?php

namespace App\Enums;

enum AssignmentStatus: string
{
    case Active    = 'active';
    case Completed = 'completed';
    case Released  = 'released';

    /**
     * Returns true if this status means the person is free to be
     * assigned to another project.
     */
    public function isAvailable(): bool
    {
        return $this !== self::Active;
    }

    /**
     * Human-readable label for display in the UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::Active    => 'Active',
            self::Completed => 'Completed',
            self::Released  => 'Released',
        };
    }

    /**
     * Badge colour class for the frontend (Tailwind / custom CSS compatible).
     * Returns a simple semantic string; the frontend maps this to real classes.
     */
    public function color(): string
    {
        return match ($this) {
            self::Active    => 'green',
            self::Completed => 'blue',
            self::Released  => 'gray',
        };
    }

    /**
     * All values as a plain array (useful for validation rules).
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
