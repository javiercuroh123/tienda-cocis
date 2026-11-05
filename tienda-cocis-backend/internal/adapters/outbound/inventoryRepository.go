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

func (r *RepositorioInventario) ListarInventario() ([]domain.Inventory, error) {
	consulta := `
		SELECT a."idInventorio", a."idProducto", p."nombreProducto", p."precioUnidad",
		       a."stock", a."stockMin", a."ultimaActualizacion"
		FROM almacen a
		INNER JOIN productos p ON p."idProducto" = a."idProducto"
		ORDER BY p."nombreProducto" ASC`

	filas, err := r.db.ObtenerConexion().Query(consulta)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	inventarios := []domain.Inventory{}
	for filas.Next() {
		var inv domain.Inventory
		err := filas.Scan(
			&inv.IdInventorio,
			&inv.IdProducto,
			&inv.NombreProducto,
			&inv.PrecioUnidad,
			&inv.Stock,
			&inv.StockMin,
			&inv.UltimaActualizacion,
		)
		if err != nil {
			return nil, err
		}
		inventarios = append(inventarios, inv)
	}
	return inventarios, nil
}

func (r *RepositorioInventario) BuscarInventario(idInventorio string) (*domain.Inventory, error) {
	consulta := `
		SELECT a."idInventorio", a."idProducto", p."nombreProducto", p."precioUnidad",
		       a."stock", a."stockMin", a."ultimaActualizacion"
		FROM almacen a
		INNER JOIN productos p ON p."idProducto" = a."idProducto"
		WHERE a."idInventorio" = $1`

	var inv domain.Inventory
	err := r.db.ObtenerConexion().QueryRow(consulta, idInventorio).Scan(
		&inv.IdInventorio,
		&inv.IdProducto,
		&inv.NombreProducto,
		&inv.PrecioUnidad,
		&inv.Stock,
		&inv.StockMin,
		&inv.UltimaActualizacion,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("registro de inventario no encontrado")
	}
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *RepositorioInventario) GuardarInventario(inv domain.Inventory) error {
	consulta := `
		INSERT INTO almacen ("idInventorio", "idProducto", "stock", "stockMin", "ultimaActualizacion")
		VALUES ($1, $2, $3, $4, $5)`
	_, err := r.db.ObtenerConexion().Exec(consulta, inv.IdInventorio, inv.IdProducto, inv.Stock, inv.StockMin, inv.UltimaActualizacion)
	return err
}

func (r *RepositorioInventario) ModificarInventario(inv domain.Inventory) error {
	consulta := `
		UPDATE almacen
		SET "stock" = $1, "stockMin" = $2, "ultimaActualizacion" = $3
		WHERE "idInventorio" = $4`
	res, err := r.db.ObtenerConexion().Exec(consulta, inv.Stock, inv.StockMin, inv.UltimaActualizacion, inv.IdInventorio)
	if err != nil {
		return err
	}
	afectadas, _ := res.RowsAffected()
	if afectadas == 0 {
		return errors.New("registro de inventario no encontrado")
	}
	return nil
}

func (r *RepositorioInventario) BorrarInventario(idInventorio string) error {
	consulta := `DELETE FROM almacen WHERE "idInventorio" = $1`
	res, err := r.db.ObtenerConexion().Exec(consulta, idInventorio)
	if err != nil {
		return err
	}
	afectadas, _ := res.RowsAffected()
	if afectadas == 0 {
		return errors.New("registro de inventario no encontrado")
	}
	return nil
}
