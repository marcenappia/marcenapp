-- Persist generated IARA renders as private Storage objects instead of data URLs.
alter table public.gallery_images
  add column if not exists storage_path text;

create index if not exists gallery_images_storage_path_idx
  on public.gallery_images(storage_path)
  where storage_path is not null;

comment on column public.gallery_images.storage_path is
  'Persistent private Storage path in bucket obras; image_url is a compatibility/display URL.';
