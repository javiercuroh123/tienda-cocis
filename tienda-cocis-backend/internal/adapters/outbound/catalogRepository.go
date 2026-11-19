package outbound

import (
	"database/sql"
	"fmt"
	"strings"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// ejecutor permite usar el mismo código con *sql.DB o con *sql.Tx.
type ejecutor interface {
	Exec(consulta string, args ...any) (sql.Result, error)
	Query(consulta string, args ...any) (*sql.Rows, error)
}

// tablaCatalogo es un Repository genérico para tablas simples. Los nombres de tabla
// y columna son constantes del código; los valores siempre van parametrizados.
type tablaCatalogo[T any] struct {
	db       *DatabaseConnection
	tabla    string
	columnas []string       // la primera es la clave primaria
	valores  func(*T) []any // en el mismo orden que columnas (para INSERT/UPDATE y Scan)
	nombre   string         // para mensajes: "usuario", "almacen"...
}

func citar(columnas []string) string {
	return `"` + strings.Join(columnas, `", "`) + `"`
}

func (t *tablaCatalogo[T]) Listar() ([]T, error) {
	consulta := fmt.Sprintf(`SELECT %s FROM %s ORDER BY "%s"`, citar(t.columnas), t.tabla, t.columnas[1])
	filas, err := t.db.ObtenerConexion().Query(consulta)
	if err != nil {
		return nil, err
	}
	defer filas.Close()
	lista := []T{}
	for filas.Next() {
		var entidad T
		if err := filas.Scan(t.valores(&entidad)...); err != nil {
			return nil, err
		}
		lista = append(lista, entidad)
	}
	return lista, filas.Err()
}

func (t *tablaCatalogo[T]) guardarCon(ex ejecutor, entidad T) error {
	marcadores := make([]string, len(t.columnas))
	for i := range marcadores {
		marcadores[i] = fmt.Sprintf("$%d", i+1)
	}
	consulta := fmt.Sprintf(`INSERT INTO %s (%s) VALUES (%s)`, t.tabla, citar(t.columnas), strings.Join(marcadores, ", "))
	_, err := ex.Exec(consulta, t.valores(&entidad)...)
	return traducirError(err)
}

func (t *tablaCatalogo[T]) modificarCon(ex ejecutor, entidad T) error {
	asignaciones := make([]string, 0, len(t.columnas)-1)
	for i, c := range t.columnas[1:] {
		asignaciones = append(asignaciones, fmt.Sprintf(`"%s" = $%d`, c, i+2))
	}
	consulta := fmt.Sprintf(`UPDATE %s SET %s WHERE "%s" = $1`, t.tabla, strings.Join(asignaciones, ", "), t.columnas[0])
	res, err := ex.Exec(consulta, t.valores(&entidad)...)
	return exigirFila(res, err, t.nombre+" no encontrado")
}

func (t *tablaCatalogo[T]) Guardar(entidad T) error {
	return t.guardarCon(t.db.ObtenerConexion(), entidad)
}
func (t *tablaCatalogo[T]) Modificar(entidad T) error {
	return t.modificarCon(t.db.ObtenerConexion(), entidad)
}

func (t *tablaCatalogo[T]) Borrar(id string) error {
	res, err := t.db.ObtenerConexion().Exec(fmt.Sprintf(`DELETE FROM %s WHERE "%s" = $1`, t.tabla, t.columnas[0]), id)
	return exigirFila(res, err, t.nombre+" no encontrado")
}

func NuevoRepositorioUsuario(db *DatabaseConnection) ports.CatalogRepository[domain.Usuario] {
	return &tablaCatalogo[domain.Usuario]{db: db, tabla: "usuarios", nombre: "usuario",
		columnas: []string{"idUsuario", "nombre", "correo"},
		valores:  func(u *domain.Usuario) []any { return []any{&u.IdUsuario, &u.Nombre, &u.Correo} }}
}

func NuevoRepositorioAlmacen(db *DatabaseConnection) ports.CatalogRepository[domain.Almacen] {
	return &tablaCatalogo[domain.Almacen]{db: db, tabla: "almacenes", nombre: "almacen",
		columnas: []string{"idAlmacen", "nombre", "direccion"},
		valores:  func(a *domain.Almacen) []any { return []any{&a.IdAlmacen, &a.Nombre, &a.Direccion} }}
}

func NuevoRepositorioTransporte(db *DatabaseConnection) ports.CatalogRepository[domain.Transporte] {
	return &tablaCatalogo[domain.Transporte]{db: db, tabla: "transportes", nombre: "transporte",
		columnas: []string{"idTransporte", "placa", "conductor", "tipo"},
		valores: func(t *domain.Transporte) []any {
			return []any{&t.IdTransporte, &t.Placa, &t.Conductor, &t.Tipo}
		}}
}

// RepositorioProveedor reutiliza la tabla genérica y además gestiona producto_proveedor.
type RepositorioProveedor struct {
	base *tablaCatalogo[domain.Proveedor]
}

func NuevoRepositorioProveedor(db *DatabaseConnection) ports.CatalogRepository[domain.Proveedor] {
	return &RepositorioProveedor{base: &tablaCatalogo[domain.Proveedor]{db: db, tabla: "proveedores", nombre: "proveedor",
		columnas: []string{"idProveedor", "nombre", "telefono"},
		valores:  func(p *domain.Proveedor) []any { return []any{&p.IdProveedor, &p.Nombre, &p.Telefono} }}}
}

func (r *RepositorioProveedor) Listar() ([]domain.Proveedor, error) {
	proveedores, err := r.base.Listar()
	if err != nil {
		return nil, err
	}
	filas, err := r.base.db.ObtenerConexion().Query(
		`SELECT "idProveedor", "idProducto" FROM producto_proveedor ORDER BY "idProducto"`)
	if err != nil {
		return nil, err
	}
	defer filas.Close()
	asociados := map[string][]string{}
	for filas.Next() {
		var idProveedor, idProducto string
		if err := filas.Scan(&idProveedor, &idProducto); err != nil {
			return nil, err
		}
		asociados[idProveedor] = append(asociados[idProveedor], idProducto)
	}
	for i := range proveedores {
		proveedores[i].Productos = asociados[proveedores[i].IdProveedor]
		if proveedores[i].Productos == nil {
			proveedores[i].Productos = []string{}
		}
	}
	return proveedores, filas.Err()
}

func (r *RepositorioProveedor) enTransaccion(p domain.Proveedor, escribir func(ex ejecutor) error) error {
	tx, err := r.base.db.ObtenerConexion().Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := escribir(tx); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM producto_proveedor WHERE "idProveedor" = $1`, p.IdProveedor); err != nil {
		return err
	}
	for _, idProducto := range p.Productos {
		if _, err := tx.Exec(`INSERT INTO producto_proveedor ("idProducto", "idProveedor") VALUES ($1, $2)`,
			idProducto, p.IdProveedor); err != nil {
			return traducirError(err)
		}
	}
	return tx.Commit()
}

func (r *RepositorioProveedor) Guardar(p domain.Proveedor) error {
	return r.enTransaccion(p, func(ex ejecutor) error { return r.base.guardarCon(ex, p) })
}

func (r *RepositorioProveedor) Modificar(p domain.Proveedor) error {
	return r.enTransaccion(p, func(ex ejecutor) error { return r.base.modificarCon(ex, p) })
}

func (r *RepositorioProveedor) Borrar(id string) error { return r.base.Borrar(id) }
