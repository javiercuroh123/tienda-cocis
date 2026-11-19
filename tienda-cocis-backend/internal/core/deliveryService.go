package core

import (
	"strings"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// ServicioEntrega gestiona el flujo Pendiente -> Asignada -> En tránsito -> Entregada.
// Decisión: despachar NO descuenta stock; la salida se registra en Movimientos
// para evitar un descuento doble.
type ServicioEntrega struct {
	repo ports.DeliveryRepository
}

func NuevoServicioEntrega(repo ports.DeliveryRepository) ports.DeliveryService {
	return &ServicioEntrega{repo: repo}
}

func completar(e *domain.Entrega) *domain.Entrega {
	e.Siguientes = e.Estado.Siguientes()
	if e.Detalles == nil {
		e.Detalles = []domain.DetalleEntrega{}
	}
	return e
}

func (s *ServicioEntrega) buscar(id string) (*domain.Entrega, error) {
	e, err := s.repo.BuscarEntrega(id)
	if err != nil {
		return nil, err
	}
	return completar(e), nil
}

func (s *ServicioEntrega) Listar() ([]domain.Entrega, error) {
	entregas, err := s.repo.ListarEntregas()
	if err != nil {
		return nil, err
	}
	for i := range entregas {
		completar(&entregas[i])
	}
	return entregas, nil
}

func (s *ServicioEntrega) Crear(e domain.Entrega) (*domain.Entrega, error) {
	if err := e.Normalizar(); err != nil {
		return nil, err
	}
	e.IdEntrega = generarIdentificador("ent")
	e.Estado = domain.Pendiente
	e.IdTransporte = nil
	if err := s.repo.GuardarEntrega(e); err != nil {
		return nil, err
	}
	return s.buscar(e.IdEntrega)
}

func (s *ServicioEntrega) ActualizarDetalles(id string, detalles []domain.DetalleEntrega) (*domain.Entrega, error) {
	if err := domain.ValidarDetalles(detalles); err != nil {
		return nil, err
	}
	editables := []domain.EstadoEntrega{domain.Pendiente, domain.Asignada}
	if err := s.repo.ReemplazarDetalles(id, detalles, editables); err != nil {
		return nil, err
	}
	return s.buscar(id)
}

func (s *ServicioEntrega) CambiarEstado(id string, nuevo domain.EstadoEntrega, idTransporte string) (*domain.Entrega, error) {
	actual, err := s.buscar(id)
	if err != nil {
		return nil, err
	}
	if err := domain.ValidarTransicion(actual.Estado, nuevo); err != nil {
		return nil, err
	}

	var transporte *string
	switch nuevo {
	case domain.Asignada:
		idTransporte = strings.TrimSpace(idTransporte)
		if idTransporte == "" {
			return nil, domain.Invalido("asignar requiere un vehiculo")
		}
		transporte = &idTransporte
	case domain.EnTransito:
		if len(actual.Detalles) == 0 {
			return nil, domain.Invalido("despachar requiere al menos un producto")
		}
	}

	if err := s.repo.CambiarEstado(id, actual.Estado, nuevo, transporte); err != nil {
		return nil, err
	}
	return s.buscar(id)
}
