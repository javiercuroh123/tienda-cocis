# Diagrama de clases — TiendaCocis

Los diagramas reflejan el código Go de `tienda-cocis-backend/internal`. Go no tiene clases: cada *struct* se representa como clase, cada *interface* con el estereotipo `<<interface>>` y las funciones que registran rutas con `<<funciones>>`. Los nombres de campos y métodos coinciden con el código.

Para mantener la lectura clara, el sistema se divide en tres vistas:

1. **Modelo de dominio**: entidades, Strategy y estados de entrega (State).
2. **Arquitectura hexagonal: catálogos e inventario**: Repository genérico y Singleton.
3. **Arquitectura hexagonal: movimientos y entregas**: Unit of Work y State.

En esta carpeta hay exportaciones de estos mismos diagramas: `diagrama-clases-*.png` (2×, para Word o PowerPoint) y `diagrama-clases-*.svg` (vectoriales, para navegador). Si cambias un diagrama, vuelve a exportarlo desde [mermaid.live](https://mermaid.live) o desde la vista previa de Mermaid de VS Code.

## 1. Modelo de dominio

Multiplicidades tomadas de las claves foráneas de `db/migrations/001_logistica.sql`.

```mermaid
classDiagram
  direction LR

  class Product {
    +IdProducto string
    +NombreProducto string
    +PrecioUnidad float64
    +Categoria string
  }
  class Inventory {
    +IdInventorio string
    +IdProducto string
    +IdAlmacen string
    +Stock int
    +StockMin int
    +UltimaActualizacion time.Time
    +EstrategiaAplicada string
    +ValorCalculado float64
  }
  class Almacen {
    +IdAlmacen string
    +Nombre string
    +Direccion string
    +Normalizar() error
  }
  class Usuario {
    +IdUsuario string
    +Nombre string
    +Correo string
    +Normalizar() error
  }
  class Proveedor {
    +IdProveedor string
    +Nombre string
    +Telefono string
    +Productos []string
    +Normalizar() error
  }
  class Transporte {
    +IdTransporte string
    +Placa string
    +Conductor string
    +Tipo string
    +Normalizar() error
  }
  class Movimiento {
    +IdMovimiento string
    +IdProducto string
    +IdAlmacen string
    +IdUsuario string
    +Tipo string
    +Cantidad int
    +FechaHora time.Time
    +IdTransferencia *string
  }
  class SolicitudMovimiento {
    +Tipo string
    +IdProducto string
    +IdAlmacen string
    +IdAlmacenDestino string
    +IdUsuario string
    +Cantidad int
    +Estrategia string
    +Validar() error
  }
  class Entrega {
    +IdEntrega string
    +IdTransporte *string
    +Destinatario string
    +Direccion string
    +Fecha string
    +Estado EstadoEntrega
    +Detalles []DetalleEntrega
    +Normalizar() error
  }
  class DetalleEntrega {
    +IdProducto string
    +Cantidad int
  }
  class EstadoEntrega {
    <<enumeration>>
    pendiente
    asignada
    en_transito
    entregada
    cancelada
    +Siguientes() []EstadoEntrega
  }
  class InventoryStrategy {
    <<interface>>
    +CalcularValor(stock int, precioUnidad float64) float64
    +CalcularStock(stock int) int
    +ObtenerNombre() string
  }
  class StandardStrategy
  class LiquidacionStrategy
  class VolumenStrategy
  class ErrorNegocio {
    +Tipo TipoError
    +Mensaje string
    +Error() string
  }

  Product "1" -- "0..*" Inventory : se almacena en
  Almacen "1" -- "0..*" Inventory : contiene
  Movimiento "0..*" --> "1" Product
  Movimiento "0..*" --> "1" Almacen
  Movimiento "0..*" --> "1" Usuario : responsable
  Proveedor "0..*" -- "0..*" Product : producto_proveedor
  Entrega "1" *-- "1..*" DetalleEntrega
  DetalleEntrega "0..*" --> "1" Product
  Entrega "0..*" --> "0..1" Transporte : asignado
  Entrega --> EstadoEntrega
  SolicitudMovimiento ..> Movimiento : genera 1 o 2
  Inventory ..> InventoryStrategy : valoración
  InventoryStrategy <|.. StandardStrategy
  InventoryStrategy <|.. LiquidacionStrategy
  InventoryStrategy <|.. VolumenStrategy
```

Notas:

- `ValidarTransicion(actual, nuevo)` (función de `domain/delivery.go`) aplica la tabla de transiciones: pendiente → asignada | cancelada, asignada → en_transito | cancelada, en_transito → entregada.
- Una transferencia genera dos `Movimiento` (salida y entrada) con el mismo `IdTransferencia`.
- `ErrorNegocio` clasifica los errores (validación, no encontrado, conflicto) para responder 400, 404 o 409.

## 2. Arquitectura hexagonal: catálogos e inventario

```mermaid
classDiagram
  direction TB

  class ControladorProducto {
    +ManejarProductos(w, r)
    +ManejarProductoPorId(w, r)
  }
  class ControladorInventario {
    +ManejarInventario(w, r)
    +ManejarInventarioPorId(w, r)
  }
  class RutasCatalogo {
    <<funciones>>
    +RegistrarCatalogo~T~(mux, ruta, servicio)
  }

  class ProductService {
    <<interface>>
    +ListarProductos() []Product
    +CrearProducto(p) *Product
    +ActualizarProducto(id, p) *Product
    +EliminarProducto(id) error
  }
  class InventoryService {
    <<interface>>
    +ListarInventario(estrategia, idAlmacen) []Inventory
    +ObtenerInventario(id, estrategia) *Inventory
    +ActualizarStockMinimo(id, stockMin, estrategia) *Inventory
    +EliminarInventario(id) error
  }
  class CatalogService~T~ {
    <<interface>>
    +Listar() []T
    +Crear(entidad T) *T
    +Actualizar(id, entidad T) *T
    +Eliminar(id) error
  }

  class ServicioProducto
  class ServicioInventario
  class ServicioCatalogo~T~ {
    -prefijo string
  }

  class ProductRepository {
    <<interface>>
    +ListarProductos() []Product
    +GuardarProducto(p) error
    +ModificarProducto(id, p) error
    +BorrarProducto(id) error
  }
  class InventoryRepository {
    <<interface>>
    +ListarInventario(idAlmacen) []Inventory
    +BuscarInventario(id) *Inventory
    +ModificarStockMinimo(id, stockMin) error
    +BorrarInventario(id) error
  }
  class CatalogRepository~T~ {
    <<interface>>
    +Listar() []T
    +Guardar(entidad T) error
    +Modificar(entidad T) error
    +Borrar(id) error
  }

  class DatabaseConnection {
    <<Singleton>>
    -instancia DatabaseConnection$
    -unaVez sync.Once$
    -conexion *sql.DB
    +ObtenerInstancia()$ DatabaseConnection
    +ObtenerConexion() *sql.DB
  }
  class RepositorioProducto
  class RepositorioInventario
  class tablaCatalogo~T~ {
    -tabla string
    -columnas []string
  }
  class RepositorioProveedor {
    -base tablaCatalogo
  }

  ControladorProducto --> ProductService
  ControladorInventario --> InventoryService
  RutasCatalogo --> CatalogService~T~

  ProductService <|.. ServicioProducto
  InventoryService <|.. ServicioInventario
  CatalogService~T~ <|.. ServicioCatalogo~T~

  ServicioProducto --> ProductRepository
  ServicioInventario --> InventoryRepository
  ServicioCatalogo~T~ --> CatalogRepository~T~

  ProductRepository <|.. RepositorioProducto
  InventoryRepository <|.. RepositorioInventario
  CatalogRepository~T~ <|.. tablaCatalogo~T~
  CatalogRepository~T~ <|.. RepositorioProveedor
  RepositorioProveedor o-- tablaCatalogo~T~

  RepositorioProducto --> DatabaseConnection
  RepositorioInventario --> DatabaseConnection
  tablaCatalogo~T~ --> DatabaseConnection
```

`tablaCatalogo<T>` atiende usuarios, almacenes y transportes; `RepositorioProveedor` la reutiliza y además gestiona `producto_proveedor` en una transacción.

## 3. Arquitectura hexagonal: movimientos y entregas

```mermaid
classDiagram
  direction TB

  class RutasLogistica {
    <<funciones>>
    +RegistrarMovimientos(mux, servicio)
    +RegistrarEntregas(mux, servicio)
  }

  class MovementService {
    <<interface>>
    +Registrar(SolicitudMovimiento) []Movimiento
    +Listar(idProducto, idAlmacen) []Movimiento
  }
  class DeliveryService {
    <<interface>>
    +Listar() []Entrega
    +Crear(Entrega) *Entrega
    +ActualizarDetalles(id, detalles) *Entrega
    +CambiarEstado(id, estado, idTransporte) *Entrega
  }

  class ServicioMovimiento
  class ServicioEntrega

  class UnitOfWork {
    <<interface>>
    +Ejecutar(trabajo func(InventarioTx) error) error
  }
  class InventarioTx {
    <<interface>>
    +Sumar(idProducto, idAlmacen, cantidad) error
    +Restar(idProducto, idAlmacen, cantidad) error
    +RegistrarMovimiento(Movimiento) error
  }
  class MovementRepository {
    <<interface>>
    +ListarMovimientos(idProducto, idAlmacen) []Movimiento
  }
  class DeliveryRepository {
    <<interface>>
    +ListarEntregas() []Entrega
    +BuscarEntrega(id) *Entrega
    +GuardarEntrega(Entrega) error
    +ReemplazarDetalles(id, detalles, estados) error
    +CambiarEstado(id, desde, hacia, idTransporte) error
  }

  class UnidadDeTrabajo
  class inventarioTx {
    -tx *sql.Tx
  }
  class RepositorioMovimiento
  class RepositorioEntrega
  class DatabaseConnection {
    <<Singleton>>
    +ObtenerConexion() *sql.DB
  }
  class InventoryStrategy {
    <<interface>>
  }
  class EstadoEntrega {
    <<enumeration>>
  }

  RutasLogistica --> MovementService
  RutasLogistica --> DeliveryService
  MovementService <|.. ServicioMovimiento
  DeliveryService <|.. ServicioEntrega

  ServicioMovimiento --> UnitOfWork
  ServicioMovimiento --> MovementRepository
  ServicioMovimiento ..> InventoryStrategy : bonificación en entradas
  ServicioEntrega --> DeliveryRepository
  ServicioEntrega ..> EstadoEntrega : ValidarTransicion

  UnitOfWork <|.. UnidadDeTrabajo
  InventarioTx <|.. inventarioTx
  UnidadDeTrabajo ..> inventarioTx : crea por transacción
  MovementRepository <|.. RepositorioMovimiento
  DeliveryRepository <|.. RepositorioEntrega

  UnidadDeTrabajo --> DatabaseConnection
  RepositorioMovimiento --> DatabaseConnection
  RepositorioEntrega --> DatabaseConnection
```

`UnidadDeTrabajo.Ejecutar` abre una `sql.Tx`, entrega un `inventarioTx` al caso de uso, confirma si no hay error y revierte si lo hay. `Restar` solo descuenta cuando hay stock suficiente (`UPDATE … WHERE cantidad >= $n`).
