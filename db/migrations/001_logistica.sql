-- Migración 001: módulo logístico de TiendaCocis.
--
-- Ejecutar con psql (no requiere framework):
--   psql -v ON_ERROR_STOP=1 -U cocis -d tiendacocis -f db/migrations/001_logistica.sql
--
-- * Es idempotente: si la versión ya figura en schema_migraciones, se omite.
-- * Todo el cambio ocurre en una transacción: ante cualquier error no queda nada a medias.
-- * La tabla de origen "almacen" NO se modifica ni se elimina; queda como respaldo.
--   Los datos pasan a "inventario" en el "Almacén principal" (alm-principal),
--   porque el modelo anterior no registraba la ubicación física de las existencias.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS schema_migraciones (
    "version" VARCHAR(64) PRIMARY KEY,
    "aplicada" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

SELECT EXISTS (SELECT 1 FROM schema_migraciones WHERE "version" = '001_logistica') AS ya_aplicada \gset

\if :ya_aplicada
\echo 'Migración 001_logistica ya aplicada; no hay cambios.'
\else

BEGIN;

-- 1. Validar los datos de origen antes de tocar nada.
DO $$
DECLARE
    detalle TEXT;
BEGIN
    SELECT string_agg(format('%s (idProducto=%s)', a."idInventorio", a."idProducto"), ', ')
      INTO detalle
      FROM almacen a
      LEFT JOIN productos p ON p."idProducto" = a."idProducto"
     WHERE p."idProducto" IS NULL;
    IF detalle IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: filas de almacen con producto inexistente: %', detalle;
    END IF;

    SELECT string_agg(format('%s (%s filas)', "idProducto", n), ', ')
      INTO detalle
      FROM (SELECT "idProducto", count(*) AS n FROM almacen GROUP BY "idProducto" HAVING count(*) > 1) d;
    IF detalle IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: productos duplicados en almacen: %', detalle;
    END IF;

    SELECT string_agg(format('%s (stock=%s, stockMin=%s)', "idInventorio", "stock", "stockMin"), ', ')
      INTO detalle
      FROM almacen
     WHERE "stock" < 0 OR "stockMin" < 0;
    IF detalle IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: cantidades negativas en almacen: %', detalle;
    END IF;
END $$;

-- 2. Catálogos.
CREATE TABLE usuarios (
    "idUsuario" VARCHAR(64) PRIMARY KEY,
    "nombre"    VARCHAR(150) NOT NULL CHECK (btrim("nombre") <> ''),
    "correo"    VARCHAR(150) NOT NULL UNIQUE CHECK ("correo" LIKE '%_@_%')
);

CREATE TABLE proveedores (
    "idProveedor" VARCHAR(64) PRIMARY KEY,
    "nombre"      VARCHAR(150) NOT NULL CHECK (btrim("nombre") <> ''),
    "telefono"    VARCHAR(30)  NOT NULL CHECK (btrim("telefono") <> '')
);

CREATE TABLE producto_proveedor (
    "idProducto"  VARCHAR(64) NOT NULL REFERENCES productos("idProducto") ON DELETE CASCADE,
    "idProveedor" VARCHAR(64) NOT NULL REFERENCES proveedores("idProveedor") ON DELETE CASCADE,
    PRIMARY KEY ("idProducto", "idProveedor")
);

CREATE TABLE almacenes (
    "idAlmacen" VARCHAR(64) PRIMARY KEY,
    "nombre"    VARCHAR(150) NOT NULL UNIQUE CHECK (btrim("nombre") <> ''),
    "direccion" VARCHAR(250) NOT NULL CHECK (btrim("direccion") <> '')
);

CREATE TABLE transportes (
    "idTransporte" VARCHAR(64) PRIMARY KEY,
    "placa"        VARCHAR(20)  NOT NULL UNIQUE CHECK (btrim("placa") <> ''),
    "conductor"    VARCHAR(150) NOT NULL CHECK (btrim("conductor") <> ''),
    "tipo"         VARCHAR(20)  NOT NULL CHECK ("tipo" IN ('camion', 'furgoneta', 'moto'))
);

-- 3. Existencias: una fila por producto y almacén. Se conserva "idInventorio"
--    para que las rutas /api/inventory/{id} del frontend sigan funcionando.
CREATE TABLE inventario (
    "idInventorio"        VARCHAR(64) PRIMARY KEY,
    "idProducto"          VARCHAR(64) NOT NULL REFERENCES productos("idProducto"),
    "idAlmacen"           VARCHAR(64) NOT NULL REFERENCES almacenes("idAlmacen"),
    "cantidad"            INTEGER NOT NULL DEFAULT 0 CHECK ("cantidad" >= 0),
    "stockMin"            INTEGER NOT NULL DEFAULT 5 CHECK ("stockMin" >= 0),
    "ultimaActualizacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("idProducto", "idAlmacen")
);

-- 4. Historial de movimientos. Una transferencia son dos filas (salida y entrada)
--    con el mismo "idTransferencia".
CREATE TABLE movimientos (
    "idMovimiento"    VARCHAR(64) PRIMARY KEY,
    "idProducto"      VARCHAR(64) NOT NULL REFERENCES productos("idProducto"),
    "idAlmacen"       VARCHAR(64) NOT NULL REFERENCES almacenes("idAlmacen"),
    "idUsuario"       VARCHAR(64) NOT NULL REFERENCES usuarios("idUsuario"),
    "tipo"            VARCHAR(10) NOT NULL CHECK ("tipo" IN ('entrada', 'salida')),
    "cantidad"        INTEGER NOT NULL CHECK ("cantidad" > 0),
    "fechaHora"       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idTransferencia" VARCHAR(64)
);
CREATE INDEX movimientos_fecha_idx ON movimientos ("fechaHora" DESC);

-- 5. Entregas: el transporte es opcional hasta la asignación.
CREATE TABLE entregas (
    "idEntrega"    VARCHAR(64) PRIMARY KEY,
    "idTransporte" VARCHAR(64) REFERENCES transportes("idTransporte"),
    "destinatario" VARCHAR(150) NOT NULL CHECK (btrim("destinatario") <> ''),
    "direccion"    VARCHAR(250) NOT NULL CHECK (btrim("direccion") <> ''),
    "fecha"        DATE NOT NULL,
    "estado"       VARCHAR(15) NOT NULL DEFAULT 'pendiente'
                   CHECK ("estado" IN ('pendiente', 'asignada', 'en_transito', 'entregada', 'cancelada')),
    CHECK ("estado" IN ('pendiente', 'cancelada') OR "idTransporte" IS NOT NULL)
);

CREATE TABLE detalle_entrega (
    "idEntrega"  VARCHAR(64) NOT NULL REFERENCES entregas("idEntrega") ON DELETE CASCADE,
    "idProducto" VARCHAR(64) NOT NULL REFERENCES productos("idProducto"),
    "cantidad"   INTEGER NOT NULL CHECK ("cantidad" > 0),
    PRIMARY KEY ("idEntrega", "idProducto")
);

-- 6. Datos iniciales mínimos.
INSERT INTO almacenes ("idAlmacen", "nombre", "direccion")
VALUES ('alm-principal', 'Almacén principal', 'Ubicación inicial de las existencias migradas');

INSERT INTO usuarios ("idUsuario", "nombre", "correo")
VALUES ('usr-admin', 'Administrador', 'admin@tiendacocis.local');

-- 7. Copiar existencias conservando idInventorio, cantidad y stock mínimo.
INSERT INTO inventario ("idInventorio", "idProducto", "idAlmacen", "cantidad", "stockMin", "ultimaActualizacion")
SELECT "idInventorio", "idProducto", 'alm-principal', "stock", "stockMin", "ultimaActualizacion"
  FROM almacen;

-- 8. Comprobar que cantidades y stock mínimo coinciden por producto.
DO $$
DECLARE
    detalle TEXT;
BEGIN
    SELECT string_agg(a."idProducto", ', ')
      INTO detalle
      FROM almacen a
      LEFT JOIN inventario i ON i."idProducto" = a."idProducto" AND i."idAlmacen" = 'alm-principal'
     WHERE i."idProducto" IS NULL OR i."cantidad" <> a."stock" OR i."stockMin" <> a."stockMin";
    IF detalle IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: las cantidades migradas no coinciden para: %', detalle;
    END IF;
END $$;

INSERT INTO schema_migraciones ("version") VALUES ('001_logistica');

COMMIT;

\echo 'Migración 001_logistica aplicada.'
\endif
