-- Running upgrade  -> 246fe5ad7abb

ALTER TABLE additional_services ADD COLUMN service_order_id UUID;

CREATE INDEX ix_additional_services_service_order_id ON additional_services (service_order_id);

ALTER TABLE additional_services ADD FOREIGN KEY(service_order_id) REFERENCES service_orders (id) ON DELETE CASCADE;