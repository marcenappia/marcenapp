update storage.buckets
set public=false,
    file_size_limit=10485760,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[]
where id='obras';
