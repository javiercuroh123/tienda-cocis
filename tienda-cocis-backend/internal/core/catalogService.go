package core

import (
	"strings"
	"tienda-cocis-backend/internal/ports"
)

// entidadCatalogo restringe T a entidades del dominio que saben validarse.
type entidadCatalogo[T any] interface {
	*T
	Normalizar() error
	Identificador() *string
}

// ServicioCatalogo implementa la consulta y edición de usuarios, proveedores,
// almacenes y transportes con una sola lógica.
type ServicioCatalogo[T any, P entidadCatalogo[T]] struct {
	repo    ports.CatalogRepository[T]
	prefijo string
}

func NuevoServicioCatalogo[T any, P entidadCatalogo[T]](repo ports.CatalogRepository[T], prefijo string) ports.CatalogService[T] {
	return &ServicioCatalogo[T, P]{repo: repo, prefijo: prefijo}
}

func (s *ServicioCatalogo[T, P]) Listar() ([]T, error) {
	return s.repo.Listar()
}

func (s *ServicioCatalogo[T, P]) Crear(entidad T) (*T, error) {
	if err := P(&entidad).Normalizar(); err != nil {
		return nil, err
	}
	if id := P(&entidad).Identificador(); strings.TrimSpace(*id) == "" {
		*id = generarIdentificador(s.prefijo)
	}
	if err := s.repo.Guardar(entidad); err != nil {
		return nil, err
	}
	return &entidad, nil
}

func (s *ServicioCatalogo[T, P]) Actualizar(id string, entidad T) (*T, error) {
	*P(&entidad).Identificador() = id
	if err := P(&entidad).Normalizar(); err != nil {
		return nil, err
	}
	if err := s.repo.Modificar(entidad); err != nil {
		return nil, err
	}
	return &entidad, nil
}

func (s *ServicioCatalogo[T, P]) Eliminar(id string) error {
	return s.repo.Borrar(id)
}
