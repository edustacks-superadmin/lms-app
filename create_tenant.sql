
WITH new_tenant AS (
  INSERT INTO institute_settings (name, slug, description)
  VALUES ('Mahesh Medico Academy', 'maheshmedicoacademy', 'Mahesh Medico Academy')
  RETURNING id
)
UPDATE institute_settings
SET institute_id = new_tenant.id
FROM new_tenant
WHERE institute_settings.id = new_tenant.id;
