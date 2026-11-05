package core

import (
	"errors"
	"strings"
	"time"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type ServicioInventario struct {
	repoInventario ports.InventoryRepository
	repoProducto   ports.ProductRepository
}

func NuevoServicioInventario(repoInv ports.InventoryRepository, repoProd ports.ProductRepository) ports.InventoryService {
	return &ServicioInventario{
		repoInventario: repoInv,
		repoProducto:   repoProd,
	}
}

func aplicarReglaEstrategia(item *domain.Inventory, estrategia domain.InventoryStrategy) {
	item.EstrategiaAplicada = estrategia.ObtenerNombre()
	item.ValorCalculado = estrategia.CalcularValor(item.Stock, item.PrecioUnidad)
}

func (s *ServicioInventario) ListarInventario(tipoEstrategia string) ([]domain.Inventory, error) {
	registros, err := s.repoInventario.ListarInventario()
	if err != nil {
		return nil, err
	}
	estrategia := domain.SeleccionarEstrategia(tipoEstrategia)
	for i := range registros {
		aplicarReglaEstrategia(&registros[i], estrategia)
	}
	return registros, nil
}

func (s *ServicioInventario) ObtenerInventario(idInventorio string, tipoEstrategia string) (*domain.Inventory, error) {
	registro, err := s.repoInventario.BuscarInventario(idInventorio)
	if err != nil {
		return nil, err
	}
	estrategia := domain.SeleccionarEstrategia(tipoEstrategia)
	aplicarReglaEstrategia(registro, estrategia)
	return registro, nil
}

func (s *ServicioInventario) CrearInventario(inventario domain.Inventory, tipoEstrategia string) (*domain.Inventory, error) {
	if strings.TrimSpace(inventario.IdProducto) == "" {
		return nil, errors.New("el idProducto es obligatorio")
	}
	if inventario.Stock < 0 || inventario.StockMin < 0 {
		return nil, errors.New("el stock y stockMin no pueden ser negativos")
	}

	producto, err := s.repoProducto.BuscarProducto(inventario.IdProducto)
	if err != nil {
		return nil, errors.New("el producto indicado no existe")
	}

	estrategia := domain.SeleccionarEstrategia(tipoEstrategia)
	if strings.TrimSpace(inventario.IdInventorio) == "" {
		inventario.IdInventorio = generarIdentificador("inv")
	}
	inventario.Stock = estrategia.CalcularStock(inventario.Stock)
	inventario.UltimaActualizacion = time.Now()

	if err := s.repoInventario.GuardarInventario(inventario); err != nil {
		return nil, err
	}

	inventario.NombreProducto = producto.NombreProducto
	inventario.PrecioUnidad = producto.PrecioUnidad
	aplicarReglaEstrategia(&inventario, estrategia)
	return &inventario, nil
}

func (s *ServicioInventario) ActualizarStock(idInventorio string, stock int, stockMin int, tipoEstrategia string) (*domain.Inventory, error) {
	if stock < 0 || stockMin < 0 {
		return nil, errors.New("el stock y stockMin no pueden ser negativos")
	}

	actual, err := s.repoInventario.BuscarInventario(idInventorio)
	if err != nil {
		return nil, err
	}

	estrategia := domain.SeleccionarEstrategia(tipoEstrategia)
	actual.Stock = estrategia.CalcularStock(stock)
	actual.StockMin = stockMin
	actual.UltimaActualizacion = time.Now()

	if err := s.repoInventario.ModificarInventario(*actual); err != nil {
		return nil, err
	}

	aplicarReglaEstrategia(actual, estrategia)
	return actual, nil
}

func (s *ServicioInventario) EliminarInventario(idInventorio string) error {
	return s.repoInventario.BorrarInventario(idInventorio)
}
