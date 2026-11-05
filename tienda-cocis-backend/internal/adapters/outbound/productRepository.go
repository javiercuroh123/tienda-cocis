package outbound

import (
	"database/sql"
	"errors"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type RepositorioProducto struct {
	db *DatabaseConnection
}

func NuevoRepositorioProducto(db *DatabaseConnection) ports.ProductRepository {
	return &RepositorioProducto{db: db}
}

func (r *RepositorioProducto) ListarProductos() ([]domain.Product, error) {
	consulta := `SELECT "idProducto", "nombreProducto", "precioUnidad", "categoria" FROM productos ORDER BY "nombreProducto" ASC`
	filas, err := r.db.ObtenerConexion().Query(consulta)
	if err != nil {
		return nil, err
	}
	defer filas.Close()

	productos := []domain.Product{}
	for filas.Next() {
		var p domain.Product
		if err := filas.Scan(&p.IdProducto, &p.NombreProducto, &p.PrecioUnidad, &p.Categoria); err != nil {
			return nil, err
		}
		productos = append(productos, p)
	}
	return productos, nil
}

func (r *RepositorioProducto) BuscarProducto(idProducto string) (*domain.Product, error) {
	consulta := `SELECT "idProducto", "nombreProducto", "precioUnidad", "categoria" FROM productos WHERE "idProducto" = $1`
	var p domain.Product
	err := r.db.ObtenerConexion().QueryRow(consulta, idProducto).Scan(&p.IdProducto, &p.NombreProducto, &p.PrecioUnidad, &p.Categoria)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("producto no encontrado")
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *RepositorioProducto) GuardarProducto(p domain.Product) error {
	consulta := `INSERT INTO productos ("idProducto", "nombreProducto", "precioUnidad", "categoria") VALUES ($1, $2, $3, $4)`
	_, err := r.db.ObtenerConexion().Exec(consulta, p.IdProducto, p.NombreProducto, p.PrecioUnidad, p.Categoria)
	return err
}

func (r *RepositorioProducto) ModificarProducto(idProducto string, p domain.Product) error {
	consulta := `UPDATE productos SET "nombreProducto" = $1, "precioUnidad" = $2, "categoria" = $3 WHERE "idProducto" = $4`
	res, err := r.db.ObtenerConexion().Exec(consulta, p.NombreProducto, p.PrecioUnidad, p.Categoria, idProducto)
	if err != nil {
		return err
	}
	afectadas, _ := res.RowsAffected()
	if afectadas == 0 {
		return errors.New("producto no encontrado")
	}
	return nil
}

func (r *RepositorioProducto) BorrarProducto(idProducto string) error {
	consulta := `DELETE FROM productos WHERE "idProducto" = $1`
	res, err := r.db.ObtenerConexion().Exec(consulta, idProducto)
	if err != nil {
		return err
	}
	afectadas, _ := res.RowsAffected()
	if afectadas == 0 {
		return errors.New("producto no encontrado")
	}
	return nil
}
