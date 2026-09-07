-- MARCENAPP admin bootstrap: promote the canonical admin account without storing credentials in source control.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('marcenapp.ia@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
