package core

import (
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// ServicioInventario consulta existencias y aplica el Patrón Strategy a la valoración.
// Las cantidades cambian solo mediante ServicioMovimiento.
type ServicioInventario struct {
	repoInventario ports.InventoryRepository
}

func NuevoServicioInventario(repoInv ports.InventoryRepository) ports.InventoryService {
	return &ServicioInventario{repoInventario: repoInv}
}

func aplicarReglaEstrategia(item *domain.Inventory, estrategia domain.InventoryStrategy) {
	item.EstrategiaAplicada = estrategia.ObtenerNombre()
	item.ValorCalculado = estrategia.CalcularValor(item.Stock, item.PrecioUnidad)
}

func (s *ServicioInventario) ListarInventario(tipoEstrategia string, idAlmacen string) ([]domain.Inventory, error) {
	registros, err := s.repoInventario.ListarInventario(idAlmacen)
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
	aplicarReglaEstrategia(registro, domain.SeleccionarEstrategia(tipoEstrategia))
	return registro, nil
}

func (s *ServicioInventario) ActualizarStockMinimo(idInventorio string, stockMin int, tipoEstrategia string) (*domain.Inventory, error) {
	if stockMin < 0 {
		return nil, domain.Invalido("el stockMin no puede ser negativo")
	}
	if err := s.repoInventario.ModificarStockMinimo(idInventorio, stockMin); err != nil {
		return nil, err
	}
	return s.ObtenerInventario(idInventorio, tipoEstrategia)
}

func (s *ServicioInventario) EliminarInventario(idInventorio string) error {
	return s.repoInventario.BorrarInventario(idInventorio)
}
