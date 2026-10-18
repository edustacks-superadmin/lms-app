SELECT routines.routine_name, parameters.data_type, parameters.ordinal_position
FROM information_schema.routines
LEFT JOIN information_schema.parameters ON routines.specific_name = parameters.specific_name
WHERE routines.routine_schema = 'public'
ORDER BY routines.routine_name, parameters.ordinal_position;
