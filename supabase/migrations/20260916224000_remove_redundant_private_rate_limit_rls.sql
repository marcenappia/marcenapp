-- The private schema is not exposed through the Data API and its table has no
-- privileges for public API roles, so RLS adds no additional access boundary here.
alter table private.public_share_rate_limits disable row level security;
