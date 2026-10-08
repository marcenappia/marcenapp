-- Supplier + MDF catalog extension for the existing marcenaria tables.
-- Prices are intentionally not seeded: supplier prices are local/volatile and must be quoted.
alter table public.marcenaria_fornecedores
  alter column user_id drop not null;
alter table public.marcenaria_fornecedores
  add column if not exists escopo text not null default 'privado',
  add column if not exists tipo text not null default 'fornecedor',
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists pais text not null default 'BR',
  add column if not exists ativo boolean not null default true,
  add column if not exists fonte_url text;
alter table public.marcenaria_fornecedores drop constraint if exists marcenaria_fornecedores_escopo_check;
alter table public.marcenaria_fornecedores add constraint marcenaria_fornecedores_escopo_check check (escopo in ('privado','catalogo'));
alter table public.marcenaria_fornecedores drop constraint if exists marcenaria_fornecedores_tipo_check;
alter table public.marcenaria_fornecedores add constraint marcenaria_fornecedores_tipo_check check (tipo in ('fornecedor','distribuidor','fabricante','loja','regional'));

alter table public.marcenaria_materiais
  alter column user_id drop not null;
alter table public.marcenaria_materiais
  add column if not exists fornecedor_id uuid references public.marcenaria_fornecedores(id) on delete set null,
  add column if not exists escopo text not null default 'privado',
  add column if not exists fabricante text,
  add column if not exists padrao text,
  add column if not exists acabamento text,
  add column if not exists largura_chapa numeric,
  add column if not exists altura_chapa numeric,
  add column if not exists sentido_veio boolean not null default false,
  add column if not exists aparas_mm integer not null default 0,
  add column if not exists preco_atualizado_em timestamptz,
  add column if not exists fonte_url text;
alter table public.marcenaria_materiais drop constraint if exists marcenaria_materiais_escopo_check;
alter table public.marcenaria_materiais add constraint marcenaria_materiais_escopo_check check (escopo in ('privado','catalogo'));

drop policy if exists "owner suppliers" on public.marcenaria_fornecedores;
drop policy if exists "owner materials" on public.marcenaria_materiais;
create policy "catalog suppliers readable" on public.marcenaria_fornecedores for select to authenticated using (escopo='catalogo' or user_id=(select auth.uid()));
create policy "owner suppliers" on public.marcenaria_fornecedores for all to authenticated using (escopo='privado' and user_id=(select auth.uid())) with check (escopo='privado' and user_id=(select auth.uid()));
create policy "admin catalog suppliers" on public.marcenaria_fornecedores for all to authenticated using (escopo='catalogo' and public.is_admin_user((select auth.uid()))) with check (escopo='catalogo' and public.is_admin_user((select auth.uid())));
create policy "catalog materials readable" on public.marcenaria_materiais for select to authenticated using (escopo='catalogo' or user_id=(select auth.uid()));
create policy "owner materials" on public.marcenaria_materiais for all to authenticated using (escopo='privado' and user_id=(select auth.uid())) with check (escopo='privado' and user_id=(select auth.uid()));
create policy "admin catalog materials" on public.marcenaria_materiais for all to authenticated using (escopo='catalogo' and public.is_admin_user((select auth.uid()))) with check (escopo='catalogo' and public.is_admin_user((select auth.uid())));

create index if not exists idx_marcenaria_fornecedores_catalogo on public.marcenaria_fornecedores (escopo, ativo, nome);
create index if not exists idx_marcenaria_materiais_catalogo on public.marcenaria_materiais (escopo, ativo, categoria, fabricante, espessura);
create index if not exists idx_marcenaria_materiais_fornecedor on public.marcenaria_materiais (fornecedor_id);

insert into public.marcenaria_fornecedores (user_id,nome,tipo,site,observacoes,escopo,ativo,fonte_url)
select null,v.nome,v.tipo,v.site,v.obs,'catalogo',true,v.fonte
from (values
 ('Leo Madeiras','distribuidor','https://www.leomadeiras.com.br','Distribuição de insumos para marcenaria.','https://www.leomadeiras.com.br/'),
 ('GMAD','distribuidor','https://www.gmad.com.br','Rede de distribuição de produtos e serviços para móveis.','https://www.gmad.com.br/institucional/grupo-gmad'),
 ('Madeiranit','fornecedor','https://www.madeiranit.com.br','MDF, chapas, ferragens e serviços.','https://www.madeiranit.com.br/'),
 ('Madeiras Lane','fornecedor','https://madeiraslane.com.br','Fornecedor de MDF/MDP, compensados, ferragens e insumos.','https://madeiraslane.com.br/perguntas-frequentes/'),
 ('Guararapes','fabricante','https://www.guararapes.com.br','Fabricante de painéis MDF.','https://www.guararapes.com.br/'),
 ('Arauco','fabricante','https://arauco.com.br','Fabricante de painéis MDF.','https://arauco.com.br/produto/bossa-nova/'),
 ('Eucatex','fabricante','https://www.eucatex.com.br','Fabricante de painéis MDF.','https://www.eucatex.com.br/paineis/produto/paineis-mdf/mdf-bp-matt-soft/cinza-supremo'),
 ('Berneck','fabricante','https://www.berneck.com.br','Fabricante de painéis de madeira.','https://www.berneck.com.br/produtos/mdp-berneck'),
 ('Sudati','fabricante','https://sudatimdf.com.br','Fabricante de MDF e rede de revendas.','https://sudatimdf.com.br/_revendas/'),
 ('Greenplac','fabricante',null,'Fabricante de painéis MDF no Brasil.',null),
 ('Placas do Brasil','fabricante',null,'Fabricante de painéis MDF no Brasil.',null),
 ('Floraplac','fabricante',null,'Fabricante de painéis MDF no Brasil.',null)
) v(nome,tipo,site,obs,fonte)
where not exists (select 1 from public.marcenaria_fornecedores f where f.escopo='catalogo' and lower(f.nome)=lower(v.nome));

insert into public.marcenaria_materiais
(user_id,nome,categoria,unidade,espessura,fornecedor_id,escopo,fabricante,padrao,acabamento,largura_chapa,altura_chapa,sentido_veio,origem,fonte_url,metadata)
select null,v.nome,'MDF','chapa',v.espessura,f.id,'catalogo',v.fabricante,v.padrao,v.acabamento,v.largura,v.altura,v.veio,'catalogo_oficial',v.fonte,jsonb_build_object('preco_confiavel',false,'observacao','Cadastrar cotação do fornecedor local antes de orçar.','fonte_tipo','fabricante')
from (values
 ('Guararapes — São Paulo 18mm',18,'Guararapes','São Paulo','Matt',2750,1850,false,'https://www.guararapes.com.br/produto/sao-paulo/'),
 ('Guararapes — São Paulo 6mm',6,'Guararapes','São Paulo','Matt',2750,1850,false,'https://www.guararapes.com.br/produto/sao-paulo/'),
 ('Guararapes — Savana 18mm',18,'Guararapes','Savana','Syncro',2750,1850,true,'https://www.guararapes.com.br/produto/savana/'),
 ('Guararapes — Grafite 18mm',18,'Guararapes','Grafite','Matt',2750,1850,false,'https://www.guararapes.com.br/produto/grafite/'),
 ('Arauco — Bossa Nova Poro 18mm',18,'Arauco','Bossa Nova','Poro',1850,2750,true,'https://arauco.com.br/produto/bossa-nova/'),
 ('Arauco — Frevo Dueto 18mm',18,'Arauco','Frevo Dueto','Dueto',1850,2750,true,'https://arauco.com.br/produto/frevo/'),
 ('Eucatex — Cinza Supremo 18mm',18,'Eucatex','Cinza Supremo','Liso',1850,2750,false,'https://www.eucatex.com.br/paineis/produto/paineis-mdf/mdf-bp-matt-soft/cinza-supremo'),
 ('Eucatex — Tauari Amazônia 18mm',18,'Eucatex','Tauari Amazônia','Madeira',1850,2750,true,'https://www.eucatex.com.br/paineis/produto/paineis-mdf/mdf-bp-poro-supermatt/tauari-amazonia---colecao-essencia-brasileira'),
 ('Berneck — MDP Plus 18mm',18,'Berneck','MDP Plus','BP',1850,2750,false,'https://www.berneck.com.br/produtos/mdp-berneck')
) v(nome,espessura,fabricante,padrao,acabamento,largura,altura,veio,fonte)
join public.marcenaria_fornecedores f on f.escopo='catalogo' and lower(f.nome)=lower(v.fabricante)
where not exists (select 1 from public.marcenaria_materiais m where m.escopo='catalogo' and lower(m.nome)=lower(v.nome));
