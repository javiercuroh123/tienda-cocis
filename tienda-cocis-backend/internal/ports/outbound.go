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

// InventoryRepository define el puerto de salida para persistencia del almacén.
type InventoryRepository interface {
	ListarInventario() ([]domain.Inventory, error)
	BuscarInventario(idInventorio string) (*domain.Inventory, error)
	GuardarInventario(inventario domain.Inventory) error
	ModificarInventario(inventario domain.Inventory) error
	BorrarInventario(idInventorio string) error
}
