-- Running upgrade  -> b686a6fd0e56

DROP INDEX ix_additional_services_service_order_id;

ALTER TABLE additional_services DROP CONSTRAINT additional_services_service_order_id_fkey;

ALTER TABLE additional_services DROP COLUMN service_order_id;
