create index if not exists chat_messages_project_id_idx on public.chat_messages(project_id);
create index if not exists clientes_user_id_idx on public.clientes(user_id);
create index if not exists custom_clauses_user_id_idx on public.custom_clauses(user_id);
create index if not exists diario_entradas_project_id_idx on public.diario_entradas(project_id);
create index if not exists gallery_images_user_id_idx on public.gallery_images(user_id);
create index if not exists projects_cliente_id_idx on public.projects(cliente_id);
create index if not exists projects_user_id_idx on public.projects(user_id);
