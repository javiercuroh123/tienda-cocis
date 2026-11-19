package ports

import "tienda-cocis-backend/internal/domain"

// ProductRepository define el puerto de salida para persistencia de productos.
type ProductRepository interface {
	ListarProductos() ([]domain.Product, error)
	BuscarProducto(idProducto string) (*domain.Product, error)
	GuardarProducto(producto domain.Product) error
	ModificarProducto(idProducto string, producto domain.Product) error
	BorrarProducto(idProducto string) error
}

// InventoryRepository consulta existencias. Las cantidades solo cambian mediante
// movimientos (InventarioTx); aquí únicamente se edita el stock mínimo.
type InventoryRepository interface {
	ListarInventario(idAlmacen string) ([]domain.Inventory, error)
	BuscarInventario(idInventorio string) (*domain.Inventory, error)
	ModificarStockMinimo(idInventorio string, stockMin int) error
	BorrarInventario(idInventorio string) error
}

// CatalogRepository es el Repository genérico de usuarios, proveedores, almacenes y transportes.
type CatalogRepository[T any] interface {
	Listar() ([]T, error)
	Guardar(entidad T) error
	Modificar(entidad T) error
	Borrar(id string) error
}

// InventarioTx agrupa las operaciones que deben ocurrir dentro de una misma transacción.
type InventarioTx interface {
	Sumar(idProducto, idAlmacen string, cantidad int) error
	// Restar descuenta solo si hay stock suficiente; si no, devuelve un conflicto.
	Restar(idProducto, idAlmacen string, cantidad int) error
	RegistrarMovimiento(movimiento domain.Movimiento) error
}

// UnitOfWork ejecuta el trabajo en una transacción: confirma si no hay error y revierte si lo hay.
type UnitOfWork interface {
	Ejecutar(trabajo func(tx InventarioTx) error) error
}

type MovementRepository interface {
	ListarMovimientos(idProducto, idAlmacen string) ([]domain.Movimiento, error)
}

type DeliveryRepository interface {
	ListarEntregas() ([]domain.Entrega, error)
	BuscarEntrega(idEntrega string) (*domain.Entrega, error)
	GuardarEntrega(entrega domain.Entrega) error
	// ReemplazarDetalles solo procede si la entrega sigue en uno de los estados indicados.
	ReemplazarDetalles(idEntrega string, detalles []domain.DetalleEntrega, estados []domain.EstadoEntrega) error
	// CambiarEstado actualiza solo si el estado almacenado sigue siendo "desde".
	CambiarEstado(idEntrega string, desde, hacia domain.EstadoEntrega, idTransporte *string) error
}
