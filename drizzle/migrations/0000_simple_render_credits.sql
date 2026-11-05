CREATE TABLE IF NOT EXISTS public.billing_wallets (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_wallets TO authenticated;
GRANT ALL ON public.billing_wallets TO service_role;
ALTER TABLE public.billing_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own wallet" ON public.billing_wallets;
CREATE POLICY "Users view own wallet" ON public.billing_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.billing_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  idempotency_key text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'consumed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, operation_type, idempotency_key)
);
GRANT SELECT ON public.billing_credit_ledger TO authenticated;
GRANT ALL ON public.billing_credit_ledger TO service_role;
ALTER TABLE public.billing_credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own ledger" ON public.billing_credit_ledger;
CREATE POLICY "Users view own ledger" ON public.billing_credit_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_billing_credit(p_user_id uuid, p_operation_type text, p_idempotency_key text)
RETURNS TABLE(status text, balance integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cost integer; v_existing text; v_balance integer;
BEGIN
  v_cost := CASE WHEN p_operation_type IN ('image_render','render','ai_image','render_image') OR p_operation_type ILIKE '%image%' OR p_operation_type ILIKE '%render%' THEN 1 ELSE NULL END;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'commercial_rule_missing'; END IF;
  SELECT l.status INTO v_existing FROM billing_credit_ledger l WHERE l.user_id=p_user_id AND l.operation_type=p_operation_type AND l.idempotency_key=p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    SELECT w.balance INTO v_balance FROM billing_wallets w WHERE w.user_id=p_user_id;
    RETURN QUERY SELECT v_existing, v_balance; RETURN;
  END IF;
  INSERT INTO billing_wallets(user_id, balance) VALUES (p_user_id, 10) ON CONFLICT (user_id) DO NOTHING;
  SELECT w.balance INTO v_balance FROM billing_wallets w WHERE w.user_id=p_user_id FOR UPDATE;
  IF v_balance < v_cost THEN RAISE EXCEPTION 'insufficient_credits'; END IF;
  UPDATE billing_wallets SET balance = balance - v_cost, updated_at = now() WHERE user_id=p_user_id RETURNING billing_wallets.balance INTO v_balance;
  INSERT INTO billing_credit_ledger(user_id, operation_type, idempotency_key, amount) VALUES (p_user_id, p_operation_type, p_idempotency_key, v_cost);
  RETURN QUERY SELECT 'consumed'::text, v_balance;
END $$;

CREATE OR REPLACE FUNCTION public.refund_billing_credit(p_user_id uuid, p_operation_type text, p_idempotency_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_amount integer;
BEGIN
  UPDATE billing_credit_ledger SET status='refunded', updated_at=now()
   WHERE user_id=p_user_id AND operation_type=p_operation_type AND idempotency_key=p_idempotency_key AND status='consumed'
   RETURNING amount INTO v_amount;
  IF v_amount IS NOT NULL THEN
    UPDATE billing_wallets SET balance = balance + v_amount, updated_at=now() WHERE user_id=p_user_id;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.consume_billing_credit(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_billing_credit(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_billing_credit(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_billing_credit(uuid,text,text) TO service_role;