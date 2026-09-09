create index if not exists billing_purchases_user_customer_idx on public.billing_purchases(user_id, asaas_customer_id);
create index if not exists billing_subscriptions_user_customer_idx on public.billing_subscriptions(user_id, asaas_customer_id);
