create index if not exists iara_memory_embeddings_message_id_idx
  on public.iara_memory_embeddings (message_id);

create index if not exists iara_memory_embeddings_project_id_idx
  on public.iara_memory_embeddings (project_id);
