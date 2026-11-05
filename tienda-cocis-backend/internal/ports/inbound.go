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

// InventoryService define el puerto de entrada para casos de uso de inventario y estrategias.
type InventoryService interface {
	ListarInventario(estrategia string) ([]domain.Inventory, error)
	ObtenerInventario(idInventorio string, estrategia string) (*domain.Inventory, error)
	CrearInventario(inventario domain.Inventory, estrategia string) (*domain.Inventory, error)
	ActualizarStock(idInventorio string, stock int, stockMin int, estrategia string) (*domain.Inventory, error)
	EliminarInventario(idInventorio string) error
}
