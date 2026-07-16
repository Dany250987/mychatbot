-- Agrega metadatos para almacenar evidencias en Cloudinary.
-- No modifica ni elimina las evidencias locales existentes.

ALTER TABLE expenses
  ADD COLUMN evidence_storage_provider VARCHAR(20) NULL
  AFTER evidence_size_bytes;

ALTER TABLE expenses
  ADD COLUMN evidence_cloudinary_asset_id VARCHAR(255) NULL
  AFTER evidence_storage_provider;

ALTER TABLE expenses
  ADD COLUMN evidence_cloudinary_public_id VARCHAR(500) NULL
  AFTER evidence_cloudinary_asset_id;

ALTER TABLE expenses
  ADD COLUMN evidence_cloudinary_resource_type VARCHAR(20) NULL
  AFTER evidence_cloudinary_public_id;

ALTER TABLE expenses
  ADD COLUMN evidence_cloudinary_delivery_type VARCHAR(30) NULL
  AFTER evidence_cloudinary_resource_type;

ALTER TABLE expenses
  ADD COLUMN evidence_cloudinary_format VARCHAR(20) NULL
  AFTER evidence_cloudinary_delivery_type;