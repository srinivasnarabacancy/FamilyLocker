<?php

namespace App\Database;

use Illuminate\Database\PostgresConnection as BasePostgresConnection;

/**
 * Custom PostgresConnection that converts PHP booleans to the string literals
 * 'TRUE' / 'FALSE' instead of 1 / 0.
 *
 * This is required when PDO::ATTR_EMULATE_PREPARES is enabled (needed for
 * Supabase PgBouncer in transaction mode). Without this override, Laravel's
 * default prepareBindings() casts booleans via (int) $value → 1/0, which
 * PostgreSQL rejects with:
 *   "operator does not exist: boolean = integer"
 */
class PostgresConnection extends BasePostgresConnection
{
    /**
     * Prepare the query bindings for execution.
     *
     * @param  array  $bindings
     * @return array
     */
    public function prepareBindings(array $bindings): array
    {
        // Convert PHP booleans to PostgreSQL literal strings BEFORE parent
        // processes them (parent casts booleans to int, breaking pgsql).
        foreach ($bindings as $key => $value) {
            if (is_bool($value)) {
                $bindings[$key] = $value ? 'TRUE' : 'FALSE';
            }
        }

        return parent::prepareBindings($bindings);
    }
}
