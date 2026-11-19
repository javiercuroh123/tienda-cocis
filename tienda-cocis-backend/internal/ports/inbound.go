package ports

import "tienda-cocis-backend/internal/domain"

// ProductService define el puerto de entrada para casos de uso de productos.
type ProductService interface {
	ListarProductos() ([]domain.Product, error)
	ObtenerProducto(idProducto string) (*domain.Product, error)
	CrearProducto(producto domain.Product) (*domain.Product, error)
	ActualizarProducto(idProducto string, producto domain.Product) (*domain.Product, error)
	EliminarProducto(idProducto string) error
}

// InventoryService define el puerto de entrada para consultar existencias con Strategy.
type InventoryService interface {
	ListarInventario(estrategia string, idAlmacen string) ([]domain.Inventory, error)
	ObtenerInventario(idInventorio string, estrategia string) (*domain.Inventory, error)
	ActualizarStockMinimo(idInventorio string, stockMin int, estrategia string) (*domain.Inventory, error)
	EliminarInventario(idInventorio string) error
}

// CatalogService es el caso de uso genérico de consulta y edición de catálogos.
type CatalogService[T any] interface {
	Listar() ([]T, error)
	Crear(entidad T) (*T, error)
	Actualizar(id string, entidad T) (*T, error)
	Eliminar(id string) error
}

type MovementService interface {
	Registrar(solicitud domain.SolicitudMovimiento) ([]domain.Movimiento, error)
	Listar(idProducto, idAlmacen string) ([]domain.Movimiento, error)
}

type DeliveryService interface {
	Listar() ([]domain.Entrega, error)
	Crear(entrega domain.Entrega) (*domain.Entrega, error)
	ActualizarDetalles(idEntrega string, detalles []domain.DetalleEntrega) (*domain.Entrega, error)
	CambiarEstado(idEntrega string, estado domain.EstadoEntrega, idTransporte string) (*domain.Entrega, error)
}
