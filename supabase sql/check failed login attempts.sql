SELECT phone, tenant_slug, succeeded, created_at
FROM auth_login_attempts
ORDER BY created_at DESC;