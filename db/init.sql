CREATE TABLE IF NOT EXISTS productos (
    "idProducto" VARCHAR(64) PRIMARY KEY,
    "nombreProducto" VARCHAR(150) NOT NULL,
    "precioUnidad" DOUBLE PRECISION NOT NULL,
    "categoria" VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS almacen (
    "idInventorio" VARCHAR(64) PRIMARY KEY,
    "idProducto" VARCHAR(64) NOT NULL UNIQUE REFERENCES productos("idProducto") ON DELETE CASCADE,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMin" INTEGER NOT NULL DEFAULT 5,
    "ultimaActualizacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO productos ("idProducto", "nombreProducto", "precioUnidad", "categoria") VALUES
    ('prod-001', 'Caja de Cartón Shalom Mediana (30x20x20)', 4.50, 'Embalaje y Cajas'),
    ('prod-002', 'Caja de Cartón Shalom Grande Reforzada', 8.00, 'Embalaje y Cajas'),
    ('prod-003', 'Sobre Manila A4 con Burbuja para Encomienda', 2.50, 'Sobres y Documentos'),
    ('prod-004', 'Rollo de Film Stretch Embalaje 50cm', 28.00, 'Insumos de Almacén'),
    ('prod-005', 'Cinta de Embalaje Impresa Shalom (6 unid.)', 18.50, 'Precintos y Seguridad'),
    ('prod-006', 'Rollo Plástico Burbuja Protector 10m', 22.00, 'Protección de Carga'),
    ('prod-007', 'Saco de Rafia Laminado para Encomienda Pesada', 6.50, 'Embalaje Pesado')
ON CONFLICT ("idProducto") DO NOTHING;

INSERT INTO almacen ("idInventorio", "idProducto", "stock", "stockMin", "ultimaActualizacion") VALUES
    ('inv-001', 'prod-001', 120, 30, CURRENT_TIMESTAMP),
    ('inv-002', 'prod-002', 12, 20, CURRENT_TIMESTAMP),
    ('inv-003', 'prod-003', 85, 25, CURRENT_TIMESTAMP),
    ('inv-004', 'prod-004', 6, 10, CURRENT_TIMESTAMP),
    ('inv-005', 'prod-005', 45, 15, CURRENT_TIMESTAMP),
    ('inv-006', 'prod-006', 8, 12, CURRENT_TIMESTAMP),
    ('inv-007', 'prod-007', 60, 20, CURRENT_TIMESTAMP)
ON CONFLICT ("idInventorio") DO NOTHING;
