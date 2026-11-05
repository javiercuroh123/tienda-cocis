package core

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type ServicioProducto struct {
	repositorio ports.ProductRepository
}

func NuevoServicioProducto(repositorio ports.ProductRepository) ports.ProductService {
	return &ServicioProducto{repositorio: repositorio}
}

func generarIdentificador(prefijo string) string {
	bytes := make([]byte, 4)
	_, _ = rand.Read(bytes)
	return prefijo + "-" + hex.EncodeToString(bytes)
}

func (s *ServicioProducto) ListarProductos() ([]domain.Product, error) {
	return s.repositorio.ListarProductos()
}

func (s *ServicioProducto) ObtenerProducto(idProducto string) (*domain.Product, error) {
	return s.repositorio.BuscarProducto(idProducto)
}

func (s *ServicioProducto) CrearProducto(producto domain.Product) (*domain.Product, error) {
	producto.NombreProducto = strings.TrimSpace(producto.NombreProducto)
	producto.Categoria = strings.TrimSpace(producto.Categoria)

	if producto.NombreProducto == "" {
		return nil, errors.New("el nombreProducto es obligatorio")
	}
	if producto.PrecioUnidad <= 0 {
		return nil, errors.New("el precioUnidad debe ser mayor a cero")
	}
	if producto.Categoria == "" {
		return nil, errors.New("la categoria es obligatoria")
	}
	if strings.TrimSpace(producto.IdProducto) == "" {
		producto.IdProducto = generarIdentificador("prod")
	}

	if err := s.repositorio.GuardarProducto(producto); err != nil {
		return nil, err
	}
	return &producto, nil
}

func (s *ServicioProducto) ActualizarProducto(idProducto string, producto domain.Product) (*domain.Product, error) {
	producto.IdProducto = idProducto
	producto.NombreProducto = strings.TrimSpace(producto.NombreProducto)
	producto.Categoria = strings.TrimSpace(producto.Categoria)

	if producto.NombreProducto == "" || producto.PrecioUnidad <= 0 || producto.Categoria == "" {
		return nil, errors.New("datos de producto invalidos")
	}

	if err := s.repositorio.ModificarProducto(idProducto, producto); err != nil {
		return nil, err
	}
	return &producto, nil
}

func (s *ServicioProducto) EliminarProducto(idProducto string) error {
	return s.repositorio.BorrarProducto(idProducto)
}
