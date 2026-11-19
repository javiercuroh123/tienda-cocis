package outbound

import (
	"database/sql"
	"errors"
	"regexp"
	"strings"
	"tienda-cocis-backend/internal/domain"

	"github.com/lib/pq"
)

var claveDuplicada = regexp.MustCompile(`Key \((.+)\)=\((.+)\)`)

// traducirError convierte las violaciones de restricciones de PostgreSQL en errores de negocio.
func traducirError(err error) error {
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) {
		return err
	}
	switch pqErr.Code {
	case "23503": // foreign_key_violation
		if strings.Contains(pqErr.Detail, "still referenced") {
			return domain.Conflicto("no se puede eliminar: el registro esta en uso en " + pqErr.Table)
		}
		return domain.Invalido("referencia inexistente: " + pqErr.Detail)
	case "23505": // unique_violation
		if m := claveDuplicada.FindStringSubmatch(pqErr.Detail); m != nil {
			return domain.Conflicto("ya existe un registro con " + m[1] + " = " + m[2])
		}
		return domain.Conflicto("ya existe un registro con esos datos")
	case "23514", "23502": // check_violation, not_null_violation
		return domain.Invalido("los datos no cumplen las restricciones (" + pqErr.Constraint + ")")
	}
	return err
}

// exigirFila devuelve NoEncontrado si una actualización o borrado no afectó filas.
func exigirFila(res sql.Result, err error, mensaje string) error {
	if err != nil {
		return traducirError(err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.NoEncontrado(mensaje)
	}
	return nil
}
