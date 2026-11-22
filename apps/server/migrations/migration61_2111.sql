DELETE FROM role_permissions role_language_read
USING roles, permissions language_read
WHERE role_language_read.role_id = roles.id
  AND role_language_read.permission_id = language_read.id
  AND language_read.code = 'languages.read'
  AND EXISTS (
      SELECT 1
      FROM role_permissions settings_read_assignment
      JOIN permissions settings_read ON settings_read.id = settings_read_assignment.permission_id
      WHERE settings_read_assignment.role_id = roles.id
        AND settings_read.code = 'settings.read'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions settings_write_assignment
      JOIN permissions settings_write ON settings_write.id = settings_write_assignment.permission_id
      WHERE settings_write_assignment.role_id = roles.id
        AND settings_write.code = 'settings.write'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions languages_write_assignment
      JOIN permissions languages_write ON languages_write.id = languages_write_assignment.permission_id
      WHERE languages_write_assignment.role_id = roles.id
        AND languages_write.code = 'languages.write'
  );
