# RoomPlan → Supabase → YARA

## Arquitetura

O app iOS usa o RoomPlan para capturar um ambiente. O JSON paramétrico é enviado ao endpoint `roomplan-ingest` e o arquivo USDZ é armazenado no bucket privado `room-scans`.

```text
iPhone Pro/LiDAR
  → RoomPlan/CapturedRoom
  → room-scans/{user_id}/{scan_id}/roomplan.json
  → room-scans/{user_id}/{scan_id}/room.usdz
  → roomplan-ingest
  → room_scans + room_scan_objects
  → projects
  → YARA
```

## Payload do endpoint

`POST /functions/v1/roomplan-ingest` exige o JWT Supabase da sessão autenticada:

```json
{
  "scanId": "uuid",
  "projectName": "Cozinha planejada",
  "capturedStructure": {},
  "usdzStoragePath": "user-id/scan-id/room.usdz",
  "previewStoragePath": "user-id/scan-id/preview.jpg",
  "units": "meters",
  "confidence": "high"
}
```

A função valida o usuário, grava o scan, normaliza objetos conhecidos, cria o projeto quando encontra largura, altura e profundidade, e retorna as próximas ações da YARA:

```json
{
  "status": "completed",
  "nextActions": [
    "analisar_ambiente",
    "gerar_render",
    "gerar_orcamento",
    "gerar_plano_de_corte"
  ]
}
```

Quando as dimensões não estiverem disponíveis no payload, o scan fica `needs_review` e a YARA deve pedir confirmação antes de criar o projeto.

## Deploy

A migration cria as tabelas `room_scans` e `room_scan_objects`, ativa RLS e cria o bucket privado `room-scans`. O workflow de Supabase publica a função depois de aplicar as migrations.

Secrets necessários no Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

O app iOS nunca deve receber a service role key. Ele usa apenas a anon key e o JWT da sessão autenticada.

## YARA

A função é o webhook de ingestão da YARA: o resultado do scan vira contexto estruturado. O próximo comando pode ser enviado pelo chat interno:

```text
Use o scan mais recente para criar o projeto do ambiente.
```

A YARA deve usar o caminho determinístico quando as dimensões tiverem confiança suficiente. A IA fica reservada para classificar objetos ambíguos, sugerir o móvel e interpretar pedidos de render ou orçamento.

## Código iOS

O exemplo completo está em [`RoomPlanScanner.swift`](./RoomPlanScanner.swift). Ele captura o ambiente, exporta JSON e USDZ, envia os assets ao Storage e chama a Edge Function.
