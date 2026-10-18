-- Normalize roles to lowercase to ensure consistency
UPDATE public.members
SET role = lower(role);

-- Verify the changes
SELECT role, count(*) 
FROM public.members 
GROUP BY role;
