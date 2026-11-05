package inbound

import (
	"encoding/json"
	"net/http"
	"strings"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type ControladorProducto struct {
	servicio ports.ProductService
}

func NuevoControladorProducto(servicio ports.ProductService) *ControladorProducto {
	return &ControladorProducto{servicio: servicio}
}

func responderJSON(w http.ResponseWriter, codigo int, carga interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(codigo)
	if carga != nil {
		_ = json.NewEncoder(w).Encode(carga)
	}
}

func responderError(w http.ResponseWriter, codigo int, mensaje string) {
	responderJSON(w, codigo, map[string]string{"error": mensaje})
}

func (c *ControladorProducto) ManejarProductos(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		c.listarProductos(w, r)
	case http.MethodPost:
		c.crearProducto(w, r)
	default:
		responderError(w, http.StatusMethodNotAllowed, "metodo no permitido")
	}
}

func (c *ControladorProducto) ManejarProductoPorId(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/products/")
	if id == "" {
		responderError(w, http.StatusBadRequest, "idProducto requerido")
		return
	}

	switch r.Method {
	case http.MethodGet:
		c.obtenerProducto(w, id)
	case http.MethodPut:
		c.actualizarProducto(w, r, id)
	case http.MethodDelete:
		c.eliminarProducto(w, id)
	default:
		responderError(w, http.StatusMethodNotAllowed, "metodo no permitido")
	}
}

func (c *ControladorProducto) listarProductos(w http.ResponseWriter, _ *http.Request) {
	productos, err := c.servicio.ListarProductos()
	if err != nil {
		responderError(w, http.StatusInternalServerError, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, productos)
}

func (c *ControladorProducto) obtenerProducto(w http.ResponseWriter, idProducto string) {
	producto, err := c.servicio.ObtenerProducto(idProducto)
	if err != nil {
		responderError(w, http.StatusNotFound, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, producto)
}

func (c *ControladorProducto) crearProducto(w http.ResponseWriter, r *http.Request) {
	var entrada domain.Product
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		responderError(w, http.StatusBadRequest, "formato JSON invalido")
		return
	}
	creado, err := c.servicio.CrearProducto(entrada)
	if err != nil {
		responderError(w, http.StatusBadRequest, err.Error())
		return
	}
	responderJSON(w, http.StatusCreated, creado)
}

func (c *ControladorProducto) actualizarProducto(w http.ResponseWriter, r *http.Request, idProducto string) {
	var entrada domain.Product
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		responderError(w, http.StatusBadRequest, "formato JSON invalido")
		return
	}
	actualizado, err := c.servicio.ActualizarProducto(idProducto, entrada)
	if err != nil {
		responderError(w, http.StatusBadRequest, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, actualizado)
}

func (c *ControladorProducto) eliminarProducto(w http.ResponseWriter, idProducto string) {
	if err := c.servicio.EliminarProducto(idProducto); err != nil {
		responderError(w, http.StatusNotFound, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, map[string]string{"mensaje": "producto eliminado"})
}
