const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('1. Granting permissions...');
        await prisma.$executeRawUnsafe(`GRANT ALL ON TABLE public.members TO postgres, service_role, authenticated, anon;`);
        await prisma.$executeRawUnsafe(`GRANT ALL ON SEQUENCE public.members_id_seq TO postgres, service_role, authenticated, anon;`);

        console.log('2. Dropping old trigger/function...');
        await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`);
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.handle_new_user();`);

        console.log('3. Creating new function...');
        await prisma.$executeRawUnsafe(`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
  v_first_name text;
  v_last_name text;
  v_display_name text;
  v_username text;
  v_base_username text;
  v_counter int;
  v_institute_id int;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  v_first_name := COALESCE(new.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(new.raw_user_meta_data->>'last_name', '');
  
  -- Generate Display Name
  IF v_first_name = '' AND v_last_name = '' THEN
      v_display_name := new.email;
  ELSE
      v_display_name := TRIM(v_first_name || ' ' || v_last_name);
  END IF;

  -- Generate Unique Username
  v_base_username := SPLIT_PART(new.email, '@', 1);
  v_username := v_base_username;
  v_counter := 1;
  
  -- Check for collision and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.members WHERE username = v_username) LOOP
      v_username := v_base_username || v_counter;
      v_counter := v_counter + 1;
  END LOOP;

  -- Try to preserve Institute ID if it exists
  BEGIN
    SELECT id INTO v_institute_id FROM public.institute_settings LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_institute_id := NULL;
  END;

  -- Fallback to default institute_id (10) if not found or error
  IF v_institute_id IS NULL THEN
      v_institute_id := 10;
  END IF;

  -- Check if member with this email already exists (Legacy User Claim)
  IF EXISTS (SELECT 1 FROM public.members WHERE email = new.email) THEN
      -- Update existing member with new auth_user_id
      UPDATE public.members 
      SET auth_user_id = new.id,
          updated_at = NOW(),
          status = 'active'
      WHERE email = new.email;
  ELSE
      -- Insert new member
      INSERT INTO public.members (
        auth_user_id, 
        email, 
        role, 
        first_name, 
        last_name, 
        display_name, 
        username,     
        institute_id, 
        is_active,
        status,
        created_at, 
        updated_at
      )
      VALUES (
        new.id,      
        new.email, 
        v_role, 
        v_first_name, 
        v_last_name, 
        v_display_name, 
        v_username,
        v_institute_id, 
        true,
        'active',
        NOW(), 
        NOW()
      );
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Capture detailed error info
    RAISE EXCEPTION 'Database error saving new user: % (State: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

        console.log('4. Creating new trigger...');
        await prisma.$executeRawUnsafe(`
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);

        console.log('Trigger update successful!');

    } catch (e) {
        console.error('Error applying trigger:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
