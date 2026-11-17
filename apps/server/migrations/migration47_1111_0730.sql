INSERT INTO system_parameters (id, key, value)
SELECT gen_random_uuid(), 'inactivity_timeout_minutes', '30'
WHERE NOT EXISTS (
    SELECT 1 FROM system_parameters WHERE key = 'inactivity_timeout_minutes'
);
