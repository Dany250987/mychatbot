-- Revierte las columnas agregadas para Cloudinary.
-- Solo debe ejecutarse si todavía no existen evidencias almacenadas allí.

ALTER TABLE expenses
  DROP COLUMN evidence_cloudinary_format;

ALTER TABLE expenses
  DROP COLUMN evidence_cloudinary_delivery_type;

ALTER TABLE expenses
  DROP COLUMN evidence_cloudinary_resource_type;

ALTER TABLE expenses
  DROP COLUMN evidence_cloudinary_public_id;

ALTER TABLE expenses
  DROP COLUMN evidence_cloudinary_asset_id;

ALTER TABLE expenses
  DROP COLUMN evidence_storage_provider;