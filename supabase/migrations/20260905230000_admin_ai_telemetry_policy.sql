-- BLANCH 13: administradores podem consultar a telemetria operacional do orquestrador.
-- A escrita continua sendo feita pelo fluxo autenticado existente.
DROP POLICY IF EXISTS "Admins can view orchestrator telemetry" ON public.orchestrator_runs;
CREATE POLICY "Admins can view orchestrator telemetry"
ON public.orchestrator_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
