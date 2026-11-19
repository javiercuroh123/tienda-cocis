package outbound

import (
	"database/sql"
	"errors"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type RepositorioEntrega struct {
	db *DatabaseConnection
}

func NuevoRepositorioEntrega(db *DatabaseConnection) ports.DeliveryRepository {
	return &RepositorioEntrega{db: db}
}

// consultar trae entregas y sus detalles; idEntrega vacío significa todas.
func (r *RepositorioEntrega) consultar(idEntrega string) ([]domain.Entrega, error) {
	con := r.db.ObtenerConexion()
	filas, err := con.Query(`
		SELECT e."idEntrega", e."idTransporte", COALESCE(t."placa", ''), e."destinatario", e."direccion",
		       to_char(e."fecha", 'YYYY-MM-DD'), e."estado"
		FROM entregas e
		LEFT JOIN transportes t ON t."idTransporte" = e."idTransporte"
		WHERE ($1 = '' OR e."idEntrega" = $1)
		ORDER BY e."fecha" DESC, e."idEntrega"`, idEntrega)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	entregas := []domain.Entrega{}
	indice := map[string]int{}
	for filas.Next() {
		var e domain.Entrega
		if err := filas.Scan(&e.IdEntrega, &e.IdTransporte, &e.Placa, &e.Destinatario, &e.Direccion, &e.Fecha, &e.Estado); err != nil {
			return nil, err
		}
		e.Detalles = []domain.DetalleEntrega{}
		indice[e.IdEntrega] = len(entregas)
		entregas = append(entregas, e)
	}
	if err := filas.Err(); err != nil {
		return nil, err
	}

	detalles, err := con.Query(`
		SELECT d."idEntrega", d."idProducto", p."nombreProducto", d."cantidad"
		FROM detalle_entrega d
		INNER JOIN productos p ON p."idProducto" = d."idProducto"
		WHERE ($1 = '' OR d."idEntrega" = $1)
		ORDER BY p."nombreProducto"`, idEntrega)
	if err != nil {
		return nil, err
	}
	defer detalles.Close()
	for detalles.Next() {
		var id string
		var d domain.DetalleEntrega
		if err := detalles.Scan(&id, &d.IdProducto, &d.NombreProducto, &d.Cantidad); err != nil {
			return nil, err
		}
		if i, ok := indice[id]; ok {
			entregas[i].Detalles = append(entregas[i].Detalles, d)
		}
	}
	return entregas, detalles.Err()
}

func (r *RepositorioEntrega) ListarEntregas() ([]domain.Entrega, error) {
	return r.consultar("")
}

func (r *RepositorioEntrega) BuscarEntrega(idEntrega string) (*domain.Entrega, error) {
	if idEntrega == "" {
		return nil, domain.NoEncontrado("entrega no encontrada")
	}
	entregas, err := r.consultar(idEntrega)
	if err != nil {
		return nil, err
	}
	if len(entregas) == 0 {
		return nil, domain.NoEncontrado("entrega no encontrada")
	}
	return &entregas[0], nil
}

func insertarDetalles(tx *sql.Tx, idEntrega string, detalles []domain.DetalleEntrega) error {
	for _, d := range detalles {
		if _, err := tx.Exec(`INSERT INTO detalle_entrega ("idEntrega", "idProducto", "cantidad") VALUES ($1, $2, $3)`,
			idEntrega, d.IdProducto, d.Cantidad); err != nil {
			return traducirError(err)
		}
	}
	return nil
}

func (r *RepositorioEntrega) GuardarEntrega(e domain.Entrega) error {
	tx, err := r.db.ObtenerConexion().Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`
		INSERT INTO entregas ("idEntrega", "idTransporte", "destinatario", "direccion", "fecha", "estado")
		VALUES ($1, $2, $3, $4, $5, $6)`,
		e.IdEntrega, e.IdTransporte, e.Destinatario, e.Direccion, e.Fecha, e.Estado); err != nil {
		return traducirError(err)
	}
	if err := insertarDetalles(tx, e.IdEntrega, e.Detalles); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *RepositorioEntrega) ReemplazarDetalles(idEntrega string, detalles []domain.DetalleEntrega, estados []domain.EstadoEntrega) error {
	tx, err := r.db.ObtenerConexion().Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// FOR UPDATE bloquea la entrega para que no cambie de estado mientras se editan sus productos.
	var estado domain.EstadoEntrega
	err = tx.QueryRow(`SELECT "estado" FROM entregas WHERE "idEntrega" = $1 FOR UPDATE`, idEntrega).Scan(&estado)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.NoEncontrado("entrega no encontrada")
	}
	if err != nil {
		return err
	}
	editable := false
	for _, e := range estados {
		editable = editable || e == estado
	}
	if !editable {
		return domain.Conflicto("los productos solo se editan en estado pendiente o asignada")
	}

	if _, err := tx.Exec(`DELETE FROM detalle_entrega WHERE "idEntrega" = $1`, idEntrega); err != nil {
		return err
	}
	if err := insertarDetalles(tx, idEntrega, detalles); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *RepositorioEntrega) CambiarEstado(idEntrega string, desde, hacia domain.EstadoEntrega, idTransporte *string) error {
	res, err := r.db.ObtenerConexion().Exec(`
		UPDATE entregas
		SET "estado" = $1, "idTransporte" = COALESCE($2, "idTransporte")
		WHERE "idEntrega" = $3 AND "estado" = $4`, hacia, idTransporte, idEntrega, desde)
	if err != nil {
		return traducirError(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.Conflicto("la entrega cambio de estado; vuelve a consultarla")
	}
	return nil
}
