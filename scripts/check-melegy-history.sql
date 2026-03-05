-- Check the actual columns in melegy_history table
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'melegy_history'
ORDER BY ordinal_position;
