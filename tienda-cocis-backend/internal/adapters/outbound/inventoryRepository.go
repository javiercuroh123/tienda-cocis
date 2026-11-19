package outbound

import (
	"database/sql"
	"errors"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type RepositorioInventario struct {
	db *DatabaseConnection
}

func NuevoRepositorioInventario(db *DatabaseConnection) ports.InventoryRepository {
	return &RepositorioInventario{db: db}
}

const consultaInventario = `
	SELECT i."idInventorio", i."idProducto", p."nombreProducto", p."precioUnidad",
	       i."idAlmacen", a."nombre", i."cantidad", i."stockMin", i."ultimaActualizacion"
	FROM inventario i
	INNER JOIN productos p ON p."idProducto" = i."idProducto"
	INNER JOIN almacenes a ON a."idAlmacen" = i."idAlmacen"`

func escanearInventario(fila interface{ Scan(...any) error }) (domain.Inventory, error) {
	var inv domain.Inventory
	err := fila.Scan(&inv.IdInventorio, &inv.IdProducto, &inv.NombreProducto, &inv.PrecioUnidad,
		&inv.IdAlmacen, &inv.NombreAlmacen, &inv.Stock, &inv.StockMin, &inv.UltimaActualizacion)
	return inv, err
}

func (r *RepositorioInventario) ListarInventario(idAlmacen string) ([]domain.Inventory, error) {
	filas, err := r.db.ObtenerConexion().Query(consultaInventario+`
		WHERE ($1 = '' OR i."idAlmacen" = $1)
		ORDER BY p."nombreProducto", a."nombre"`, idAlmacen)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	inventarios := []domain.Inventory{}
	for filas.Next() {
		inv, err := escanearInventario(filas)
		if err != nil {
			return nil, err
		}
		inventarios = append(inventarios, inv)
	}
	return inventarios, filas.Err()
}

func (r *RepositorioInventario) BuscarInventario(idInventorio string) (*domain.Inventory, error) {
	inv, err := escanearInventario(r.db.ObtenerConexion().QueryRow(consultaInventario+` WHERE i."idInventorio" = $1`, idInventorio))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.NoEncontrado("registro de inventario no encontrado")
	}
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *RepositorioInventario) ModificarStockMinimo(idInventorio string, stockMin int) error {
	res, err := r.db.ObtenerConexion().Exec(`
		UPDATE inventario SET "stockMin" = $1, "ultimaActualizacion" = CURRENT_TIMESTAMP
		WHERE "idInventorio" = $2`, stockMin, idInventorio)
	return exigirFila(res, err, "registro de inventario no encontrado")
}

// BorrarInventario solo elimina filas sin existencias.
func (r *RepositorioInventario) BorrarInventario(idInventorio string) error {
	res, err := r.db.ObtenerConexion().Exec(
		`DELETE FROM inventario WHERE "idInventorio" = $1 AND "cantidad" = 0`, idInventorio)
	if err := exigirFila(res, err, "registro de inventario no encontrado"); err != nil {
		if _, errBuscar := r.BuscarInventario(idInventorio); errBuscar == nil {
			return domain.Conflicto("el registro tiene existencias; registra una salida antes de eliminarlo")
		}
		return err
	}
	return nil
}
