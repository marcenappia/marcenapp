# Production migration reconstruction

## Why this exists

The production `schema_migrations` ledger contains historical billing migrations whose SQL is no longer present in the repository:

- `asaas_billing`
- `marcenapp_billing_subscriptions`
- `trial_and_credits`
- `make_billing_payment_processing_atomic`

The ledger preserves migration versions/names, but it does not preserve the original SQL body. The original historical migrations therefore cannot be recreated with forensic certainty.

## What was done

`20260907000000_reconstruct_billing_production_state.sql` is an explicit **reconstruction/state migration**, not a replacement historical record. It captures the billing tables, verified production constraints/defaults that could be recovered, RLS posture, owner-read policies, billing credit functions, and trial trigger required for a fresh bootstrap to move forward.

Additional later migrations continue to harden the reconstructed state. New production changes are kept in normal Git history.

## What is intentionally not claimed

- The reconstruction is not the original SQL of any missing historical migration.
- Matching migration counts is not treated as proof of historical equivalence.
- Supabase Preview's `Remote migration versions not found in local migrations directory` failure remains a real repository/production-ledger synchronization issue until the migration-version mapping can be reconciled without fabricating history.
- A fresh-database equivalence test has not been declared green because the environment does not provide a disposable empty production-equivalent database in this session.
