package core

import (
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
	"time"
)

// ServicioMovimiento registra entradas, salidas y transferencias con Unit of Work:
// el cambio de existencias y el historial se confirman o se revierten juntos.
type ServicioMovimiento struct {
	uow  ports.UnitOfWork
	repo ports.MovementRepository
}

func NuevoServicioMovimiento(uow ports.UnitOfWork, repo ports.MovementRepository) ports.MovementService {
	return &ServicioMovimiento{uow: uow, repo: repo}
}

func (s *ServicioMovimiento) Listar(idProducto, idAlmacen string) ([]domain.Movimiento, error) {
	return s.repo.ListarMovimientos(idProducto, idAlmacen)
}

func (s *ServicioMovimiento) Registrar(sol domain.SolicitudMovimiento) ([]domain.Movimiento, error) {
	if err := sol.Validar(); err != nil {
		return nil, err
	}

	// UTC: las columnas TIMESTAMP no guardan zona y PostgreSQL usa UTC (igual que CURRENT_TIMESTAMP).
	ahora := time.Now().UTC()
	nuevo := func(tipo, idAlmacen string, cantidad int, idTransferencia *string) domain.Movimiento {
		return domain.Movimiento{
			IdMovimiento:    generarIdentificador("mov"),
			IdProducto:      sol.IdProducto,
			IdAlmacen:       idAlmacen,
			IdUsuario:       sol.IdUsuario,
			Tipo:            tipo,
			Cantidad:        cantidad,
			FechaHora:       ahora,
			IdTransferencia: idTransferencia,
		}
	}

	var movimientos []domain.Movimiento
	switch sol.Tipo {
	case "entrada":
		// Strategy: la estrategia por volumen bonifica unidades en lotes grandes.
		cantidad := domain.SeleccionarEstrategia(sol.Estrategia).CalcularStock(sol.Cantidad)
		movimientos = append(movimientos, nuevo("entrada", sol.IdAlmacen, cantidad, nil))
	case "salida":
		movimientos = append(movimientos, nuevo("salida", sol.IdAlmacen, sol.Cantidad, nil))
	case "transferencia":
		idTransferencia := generarIdentificador("trf")
		movimientos = append(movimientos,
			nuevo("salida", sol.IdAlmacen, sol.Cantidad, &idTransferencia),
			nuevo("entrada", sol.IdAlmacenDestino, sol.Cantidad, &idTransferencia))
	}

	err := s.uow.Ejecutar(func(tx ports.InventarioTx) error {
		for _, m := range movimientos {
			var err error
			if m.Tipo == "entrada" {
				err = tx.Sumar(m.IdProducto, m.IdAlmacen, m.Cantidad)
			} else {
				err = tx.Restar(m.IdProducto, m.IdAlmacen, m.Cantidad)
			}
			if err != nil {
				return err
			}
			if err := tx.RegistrarMovimiento(m); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return movimientos, nil
}
