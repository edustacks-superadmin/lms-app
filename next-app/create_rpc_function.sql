
-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION public.check_permission(resource_name text, action_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (usually postgres/superuser)
SET search_path = public, extensions -- Secure search path
AS $$
DECLARE
    user_role text;
    user_permissions jsonb;
    has_access boolean;
BEGIN
    -- 1. Get the Role of the current user
    SELECT role INTO user_role
    FROM public.members
    WHERE auth_user_id = auth.uid();

    -- Return false if no role found
    IF user_role IS NULL THEN
        RETURN false;
    END IF;

    -- 2. Super Admin Bypass
    -- Assuming 'admin' is the superuser role string in members table
    IF user_role = 'admin' THEN
        RETURN true;
    END IF;

    -- 3. Fetch Permissions for the Role
    SELECT permissions INTO user_permissions
    FROM public.roles
    WHERE name = user_role;

    -- Return false if no role definition found
    IF user_permissions IS NULL THEN
        RETURN false;
    END IF;

    -- 4. Check the JSON for the specific resource and action
    -- JSON structure: { "resource": { "action": true } }
    -- user_permissions -> resource_name ->> action_name
    
    -- Cast to boolean safely. COALESCE to handle nulls.
    has_access := COALESCE((user_permissions -> resource_name ->> action_name)::boolean, false);

    RETURN has_access;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_permission(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_permission(text, text) TO service_role;
