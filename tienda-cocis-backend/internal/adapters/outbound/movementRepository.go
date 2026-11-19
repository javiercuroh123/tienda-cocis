package outbound

import (
	"database/sql"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// UnidadDeTrabajo implementa Unit of Work sobre sql.Tx usando el pool compartido.
type UnidadDeTrabajo struct {
	db *DatabaseConnection
}

func NuevaUnidadDeTrabajo(db *DatabaseConnection) ports.UnitOfWork {
	return &UnidadDeTrabajo{db: db}
}

func (u *UnidadDeTrabajo) Ejecutar(trabajo func(tx ports.InventarioTx) error) error {
	tx, err := u.db.ObtenerConexion().Begin()
	if err != nil {
		return err
	}
	if err := trabajo(&inventarioTx{tx: tx}); err != nil {
		_ = tx.Rollback()
		return traducirError(err)
	}
	return traducirError(tx.Commit())
}

type inventarioTx struct {
	tx *sql.Tx
}

func (t *inventarioTx) Sumar(idProducto, idAlmacen string, cantidad int) error {
	_, err := t.tx.Exec(`
		INSERT INTO inventario ("idInventorio", "idProducto", "idAlmacen", "cantidad")
		VALUES ('inv-' || substr(md5(random()::text), 1, 8), $1, $2, $3)
		ON CONFLICT ("idProducto", "idAlmacen") DO UPDATE
		SET "cantidad" = inventario."cantidad" + EXCLUDED."cantidad",
		    "ultimaActualizacion" = CURRENT_TIMESTAMP`, idProducto, idAlmacen, cantidad)
	return err
}

// Restar usa una actualización condicionada: si dos solicitudes compiten, PostgreSQL
// bloquea la fila y vuelve a evaluar "cantidad >= $3", por lo que el saldo nunca queda negativo.
func (t *inventarioTx) Restar(idProducto, idAlmacen string, cantidad int) error {
	res, err := t.tx.Exec(`
		UPDATE inventario
		SET "cantidad" = "cantidad" - $3, "ultimaActualizacion" = CURRENT_TIMESTAMP
		WHERE "idProducto" = $1 AND "idAlmacen" = $2 AND "cantidad" >= $3`, idProducto, idAlmacen, cantidad)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.Conflicto("stock insuficiente en el almacen de origen")
	}
	return nil
}

func (t *inventarioTx) RegistrarMovimiento(m domain.Movimiento) error {
	_, err := t.tx.Exec(`
		INSERT INTO movimientos ("idMovimiento", "idProducto", "idAlmacen", "idUsuario", "tipo", "cantidad", "fechaHora", "idTransferencia")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		m.IdMovimiento, m.IdProducto, m.IdAlmacen, m.IdUsuario, m.Tipo, m.Cantidad, m.FechaHora, m.IdTransferencia)
	return err
}

type RepositorioMovimiento struct {
	db *DatabaseConnection
}

func NuevoRepositorioMovimiento(db *DatabaseConnection) ports.MovementRepository {
	return &RepositorioMovimiento{db: db}
}

func (r *RepositorioMovimiento) ListarMovimientos(idProducto, idAlmacen string) ([]domain.Movimiento, error) {
	filas, err := r.db.ObtenerConexion().Query(`
		SELECT m."idMovimiento", m."idProducto", p."nombreProducto", m."idAlmacen", a."nombre",
		       m."idUsuario", u."nombre", m."tipo", m."cantidad", m."fechaHora", m."idTransferencia"
		FROM movimientos m
		INNER JOIN productos p ON p."idProducto" = m."idProducto"
		INNER JOIN almacenes a ON a."idAlmacen" = m."idAlmacen"
		INNER JOIN usuarios u ON u."idUsuario" = m."idUsuario"
		WHERE ($1 = '' OR m."idProducto" = $1) AND ($2 = '' OR m."idAlmacen" = $2)
		ORDER BY m."fechaHora" DESC, m."tipo" DESC
		LIMIT 200`, idProducto, idAlmacen)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	movimientos := []domain.Movimiento{}
	for filas.Next() {
		var m domain.Movimiento
		if err := filas.Scan(&m.IdMovimiento, &m.IdProducto, &m.NombreProducto, &m.IdAlmacen, &m.NombreAlmacen,
			&m.IdUsuario, &m.NombreUsuario, &m.Tipo, &m.Cantidad, &m.FechaHora, &m.IdTransferencia); err != nil {
			return nil, err
		}
		movimientos = append(movimientos, m)
	}
	return movimientos, filas.Err()
}
