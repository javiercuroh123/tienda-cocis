# TiendaCocis

Aplicación web Full Stack simple y limpia para la gestión de **Productos** e **Inventario (Almacén)** de **TiendaCocis**, diseñada bajo **Arquitectura Hexagonal (Puertos y Adaptadores)** en Go, los patrones **Singleton** y **Strategy**, y frontend con **React + Next.js (App Router)**.

---

## 1. Estructura del Proyecto

```text
├── docker-compose.yml               # Contenedor PostgreSQL (Puerto 5434)
├── init.sql                         # Creación de tablas 'productos' y 'almacen' + datos semilla
├── tienda-cocis-backend/            # Backend en Go (Arquitectura Hexagonal + camelCase)
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── domain/                  # product.go, inventory.go, inventoryStrategy.go (Patrón Strategy)
│   │   ├── ports/                   # inbound.go, outbound.go
│   │   ├── core/                    # productService.go, inventoryService.go
│   │   └── adapters/
│   │       ├── inbound/             # productHandler.go, inventoryHandler.go
│   │       └── outbound/            # database.go (Patrón Singleton), productRepository.go, inventoryRepository.go
│   └── go.mod
└── tienda-cocis-frontend/           # Frontend React + Next.js App Router
    ├── app/                         # /, /products, /products/create, /inventory, /inventory/[id]
    ├── components/                  # ui/, productTable.jsx, inventoryForm.jsx
    ├── services/                    # api.js, productService.js, inventoryService.js
    └── public/
```

---

## 2. Tablas de Base de Datos (PostgreSQL)

1. **`productos`**:
   - `idProducto` (PK, String)
   - `nombreProducto` (String)
   - `precioUnidad` (Float)
   - `categoria` (String)

2. **`almacen`**:
   - `idInventorio` (PK, String)
   - `idProducto` (FK -> `productos.idProducto`)
   - `stock` (Int)
   - `stockMin` (Int)
   - `ultimaActualizacion` (Timestamp)

---

## 3. Patrones de Diseño Implementados

- **Patrón Singleton (Creacional):** Implementado en `tienda-cocis-backend/internal/adapters/outbound/database.go` mediante `sync.Once` (`ObtenerInstancia`) sobre `DatabaseConnection` para asegurar una única instancia global de conexión hacia PostgreSQL.
- **Patrón Strategy (Comportamiento):** Implementado en `tienda-cocis-backend/internal/domain/inventoryStrategy.go` (`InventoryStrategy`) con tres estrategias intercambiables:
  - `StandardStrategy` (`estandar`): Cálculo directo de stock y valor.
  - `LiquidacionStrategy` (`liquidacion`): Depreciación del 30% sobre el `precioUnidad` en almacén.
  - `VolumenStrategy` (`volumen`): Bonificación de +10% en unidades y descuento de valoración al registrar o actualizar lotes $\ge 20$ unidades.

---

## 4. Ejecución Paso a Paso

### Paso 1: Levantar PostgreSQL con Docker
```bash
docker compose up -d
```

### Paso 2: Iniciar el Backend (Go)
```bash
cd tienda-cocis-backend
go run ./cmd/server/main.go
```
El servidor escuchará en `http://localhost:8080`.

### Paso 3: Iniciar el Frontend (Next.js)
```bash
cd tienda-cocis-frontend
npm install
npm run dev
```
Abre `http://localhost:3000` en tu navegador.
