# TiendaCocis

Aplicación web Full Stack para la gestión de **productos**, **inventario por almacén** y **logística** (movimientos, proveedores, transportes y entregas) de **TiendaCocis**. Backend en Go con **Arquitectura Hexagonal (Puertos y Adaptadores)** y frontend con **React + Next.js (App Router) + TypeScript + Tailwind CSS**.

---

## 1. Estructura del Proyecto

```text
├── docker-compose.yml               # PostgreSQL 17 local (puerto 5434)
├── compose.ec2.yaml                 # db + backend + frontend + Caddy (despliegue)
├── db/
│   ├── init.sql                     # Esquema original (productos, almacen) + datos semilla
│   └── migrations/
│       └── 001_logistica.sql        # Migración versionada al modelo logístico
├── deploy/                          # Guía de EC2, Caddyfile y scripts de instalación
├── docs/
│   ├── diagrama-clases.md           # Diagramas de clases (Mermaid + PNG/SVG)
│   └── exposicion/                  # Diapositivas y guion de la exposición
├── tienda-cocis-backend/            # Go 1.23, net/http, database/sql, lib/pq
│   ├── cmd/server/main.go           # Arranque: Singleton -> repositorios -> servicios -> rutas
│   └── internal/
│       ├── domain/                  # Entidades, Strategy, estados de entrega (State), errores de negocio
│       ├── ports/                   # inbound.go (casos de uso), outbound.go (Repository, Unit of Work)
│       ├── core/                    # Servicios: productos, inventario, catálogos, movimientos, entregas
│       └── adapters/
│           ├── inbound/             # Rutas HTTP y traducción de errores a 400/404/409
│           └── outbound/            # SQL: Singleton, repositorios, Unit of Work, pruebas de integración
└── tienda-cocis-frontend/
    ├── app/                         # /, /products, /inventory, /movements, /deliveries,
    │                                # /warehouses, /suppliers, /transports, /users
    ├── components/                  # ui/, catalogPage.tsx (CRUD genérico), productTable, inventoryForm
    └── services/                    # api.ts, productService, inventoryService, catalogService, logisticsService
```

---

## 2. Modelo de datos (PostgreSQL)

Todas las claves son `VARCHAR(64)` con prefijo (`prod-…`, `alm-…`), igual que el modelo original.

| Tabla | Campos principales | Reglas |
|---|---|---|
| `productos` | idProducto, nombreProducto, precioUnidad, categoria | Catálogo original, sin cambios |
| `usuarios` | idUsuario, nombre, correo | Correo único. Identifican al responsable de cada movimiento |
| `proveedores` | idProveedor, nombre, telefono | — |
| `producto_proveedor` | idProducto, idProveedor | PK compuesta; se borra en cascada con el producto o proveedor |
| `almacenes` | idAlmacen, nombre, direccion | Nombre único |
| `inventario` | idInventorio, idProducto, idAlmacen, cantidad, stockMin | **Una fila por producto y almacén**; `cantidad >= 0` |
| `movimientos` | idMovimiento, idProducto, idAlmacen, idUsuario, tipo, cantidad, fechaHora, idTransferencia | `tipo` entrada/salida; `cantidad > 0`; una transferencia = salida + entrada con el mismo `idTransferencia` |
| `transportes` | idTransporte, placa, conductor, tipo | Placa única; tipo camion/furgoneta/moto |
| `entregas` | idEntrega, idTransporte (opcional), destinatario, direccion, fecha, estado | Estado pendiente/asignada/en_transito/entregada/cancelada; transporte obligatorio salvo en pendiente o cancelada |
| `detalle_entrega` | idEntrega, idProducto, cantidad | `cantidad > 0`; un producto por entrega |
| `almacen` | (tabla original) | **Se conserva intacta como respaldo** de los datos de origen |

Las claves foráneas usan `RESTRICT`: eliminar un registro en uso devuelve **409** con el motivo, y la interfaz lo muestra.

### Decisiones documentadas

- **Almacén principal.** El modelo anterior no registraba ubicación física. La migración crea `alm-principal` («Almacén principal») y le asigna todas las existencias, conservando `idInventorio`, la cantidad y el stock mínimo.
- **Usuario inicial.** La migración crea `usr-admin` («Administrador») para poder registrar movimientos desde el primer día. El proyecto no tiene autenticación propia (Caddy solo aplica un usuario de demo), así que el responsable se elige en el formulario. No se creó un sistema de cuentas.
- **Despacho y stock.** Despachar una entrega **no descuenta stock**. La salida se registra de forma explícita en *Movimientos*, para evitar un descuento doble.
- **Cantidades.** Solo cambian mediante entradas, salidas y transferencias. `PUT /api/inventory/{id}` edita únicamente `stockMin`.

---

## 3. Patrones de diseño

- **Singleton:** `outbound/database.go` (`ObtenerInstancia` con `sync.Once`) comparte un único `*sql.DB`, que se pasa a todos los adaptadores desde `main.go`.
- **Repository:** `ports/outbound.go`. `CatalogRepository[T]` es un repositorio genérico (usuarios, almacenes y transportes reutilizan `tablaCatalogo`; proveedores además gestiona `producto_proveedor`), junto con los repositorios de inventario, movimientos y entregas.
- **Unit of Work:** `ports.UnitOfWork` y `outbound/movementRepository.go`. Entradas, salidas y transferencias actualizan `inventario` y registran `movimientos` en una sola `sql.Tx`: si algo falla, se revierte todo. La salida usa `UPDATE … WHERE cantidad >= $n`, así dos solicitudes concurrentes no pueden dejar un saldo negativo.
- **Strategy:** `domain/inventoryStrategy.go`, con las estrategias estándar, liquidación y volumen. Valoran el inventario y, en una **entrada**, la estrategia por volumen bonifica +10 % de unidades en lotes de 20 o más.
- **State (versión básica):** `domain/delivery.go` define el tipo `EstadoEntrega` y la tabla de transiciones (`ValidarTransicion`). El repositorio actualiza solo si el estado almacenado sigue siendo el previo.
- **Observer:** en esta versión básica se reduce al indicador de stock bajo y al estado visible de la entrega. Se incorporarán eventos cuando exista una reacción concreta, y se publicarán después del `COMMIT`.

---

## 4. API

Formato JSON; los errores tienen la forma `{"error": "mensaje"}` con código 400 (validación), 404 (no encontrado) o 409 (conflicto: stock insuficiente, registro en uso, transición inválida o duplicado).

| Método y ruta | Uso |
|---|---|
| `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}` | Productos (contrato original) |
| `GET /api/inventory?estrategia=&idAlmacen=` | Existencias con valoración Strategy |
| `GET/PUT/DELETE /api/inventory/{id}` | Consultar, editar `stockMin` y eliminar (solo si la cantidad es 0) |
| `GET/POST /api/{users,suppliers,warehouses,transports}`, `PUT/DELETE …/{id}` | Catálogos |
| `GET /api/movements?idProducto=&idAlmacen=` | Historial (últimos 200) |
| `POST /api/movements` | `{tipo: entrada\|salida\|transferencia, idProducto, idAlmacen, idAlmacenDestino?, idUsuario, cantidad, estrategia?}` |
| `GET/POST /api/deliveries` | Listar y crear `{destinatario, direccion, fecha, detalles:[{idProducto, cantidad}]}` |
| `PUT /api/deliveries/{id}/items` | Reemplazar productos (solo en pendiente o asignada) |
| `POST /api/deliveries/{id}/estado` | `{estado, idTransporte?}`. Asignar requiere vehículo; despachar requiere al menos un producto |

---

## 5. Instalación desde cero (local)

Requisitos: Docker, Go 1.23 o superior y Node 22 o superior.

```bash
# 1. PostgreSQL 17. En un volumen vacío ejecuta db/init.sql y luego 001_logistica.sql
docker compose up -d

# 2. Backend (http://localhost:8080)
cd tienda-cocis-backend
go run ./cmd/server

# 3. Frontend (http://localhost:3000)
cd tienda-cocis-frontend
npm install
npm run dev
```

Si la API está en otra URL: `NEXT_PUBLIC_API_URL=http://localhost:8090/api npm run dev`. Detrás de Caddy se usa `/api`, que el Dockerfile fija durante el build.

## 6. Migrar una base que ya tiene datos

Los scripts de `/docker-entrypoint-initdb.d` **solo se ejecutan con un volumen vacío**. Si tu volumen ya existía, aplica la migración manualmente. La migración no borra la tabla `almacen` ni el volumen.

```bash
# Respaldo previo (recomendado)
docker exec tienda-cocis-db pg_dump -U cocis -d tiendacocis -Fc > respaldo-antes-001.dump

# Aplicar (local)
docker exec -i tienda-cocis-db psql -v ON_ERROR_STOP=1 -U cocis -d tiendacocis < db/migrations/001_logistica.sql
```

PowerShell:

```powershell
Get-Content -Raw db/migrations/001_logistica.sql | docker exec -i tienda-cocis-db psql -v ON_ERROR_STOP=1 -U cocis -d tiendacocis
```

- Es **idempotente**: registra su versión en `schema_migraciones` y, si se ejecuta otra vez, solo informa que ya fue aplicada.
- Corre en **una transacción**. Antes de copiar valida los datos y se detiene con un error que identifica los registros afectados si encuentra filas de `almacen` con producto inexistente, productos duplicados o cantidades negativas. Después de copiar compara cantidad y stock mínimo por producto.
- Al arrancar, el backend avisa en el log si falta aplicar la migración.

Para nuevas migraciones, agrega `db/migrations/002_….sql` siguiendo el mismo patrón (`schema_migraciones` y `\if`) y móntalo en Compose después del 001.

## 7. Pruebas

```bash
cd tienda-cocis-backend
go test ./...                       # unitarias (dominio y casos de uso con Unit of Work simulada)
```

Las pruebas de integración usan PostgreSQL real y **modifican datos**, así que deben ejecutarse sobre una base desechable:

```bash
docker run -d --name cocis-test -e POSTGRES_USER=cocis -e POSTGRES_PASSWORD=cocis123 -e POSTGRES_DB=tiendacocis -p 55432:5432 \
  -v "$PWD/db/init.sql:/docker-entrypoint-initdb.d/000_init.sql:ro" \
  -v "$PWD/db/migrations/001_logistica.sql:/docker-entrypoint-initdb.d/001_logistica.sql:ro" postgres:17-alpine
cd tienda-cocis-backend
TEST_DATABASE_URL="postgres://cocis:cocis123@localhost:55432/tiendacocis?sslmode=disable" go test -count=1 ./...
docker rm -f cocis-test
```

Cubren lo siguiente: la migración conserva cantidades y stock mínimo; una entrada suma y registra un movimiento; una salida sin stock se rechaza sin alterar el saldo; un fallo al registrar el movimiento revierte el stock; una transferencia actualiza ambos almacenes de forma atómica; las salidas concurrentes nunca dejan saldo negativo; una entrega guarda sus productos, acepta un vehículo y rechaza transiciones inválidas; eliminar registros en uso devuelve conflicto.

Frontend: `npm run type-check` y `npm run build`.

## 8. Despliegue en AWS

Consulta [la guía de EC2](deploy/AWS.md). En una instancia nueva basta con `up -d --build`. En una instancia que ya tiene datos, haz un respaldo y aplica la migración antes de levantar el código nuevo:

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml exec -T db pg_dump -U cocis -d tiendacocis -Fc > "backups/antes-001-$(date +%Y%m%d-%H%M%S).dump"
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml up -d db
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml exec -T db psql -v ON_ERROR_STOP=1 -U cocis -d tiendacocis -f /migraciones/001_logistica.sql
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml up -d --build --wait --wait-timeout 180
```

`compose.ec2.yaml` monta `db/migrations` en `/migraciones` dentro del contenedor de PostgreSQL. **No uses `down -v`**: borra los volúmenes y los datos.
