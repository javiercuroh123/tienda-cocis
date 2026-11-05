package inbound

import (
	"encoding/json"
	"net/http"
	"strings"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type ControladorInventario struct {
	servicio ports.InventoryService
}

func NuevoControladorInventario(servicio ports.InventoryService) *ControladorInventario {
	return &ControladorInventario{servicio: servicio}
}

type solicitudInventario struct {
	IdInventorio string `json:"idInventorio"`
	IdProducto   string `json:"idProducto"`
	Stock        int    `json:"stock"`
	StockMin     int    `json:"stockMin"`
	Estrategia   string `json:"estrategia"`
}

func (c *ControladorInventario) ManejarInventario(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		c.listarInventario(w, r)
	case http.MethodPost:
		c.crearInventario(w, r)
	default:
		responderError(w, http.StatusMethodNotAllowed, "metodo no permitido")
	}
}

func (c *ControladorInventario) ManejarInventarioPorId(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/inventory/")
	if id == "" {
		responderError(w, http.StatusBadRequest, "idInventorio requerido")
		return
	}

	switch r.Method {
	case http.MethodGet:
		c.obtenerInventario(w, r, id)
	case http.MethodPut:
		c.actualizarStock(w, r, id)
	case http.MethodDelete:
		c.eliminarInventario(w, id)
	default:
		responderError(w, http.StatusMethodNotAllowed, "metodo no permitido")
	}
}

func (c *ControladorInventario) listarInventario(w http.ResponseWriter, r *http.Request) {
	estrategia := r.URL.Query().Get("estrategia")
	registros, err := c.servicio.ListarInventario(estrategia)
	if err != nil {
		responderError(w, http.StatusInternalServerError, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, registros)
}

func (c *ControladorInventario) obtenerInventario(w http.ResponseWriter, r *http.Request, idInventorio string) {
	estrategia := r.URL.Query().Get("estrategia")
	registro, err := c.servicio.ObtenerInventario(idInventorio, estrategia)
	if err != nil {
		responderError(w, http.StatusNotFound, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, registro)
}

func (c *ControladorInventario) crearInventario(w http.ResponseWriter, r *http.Request) {
	var entrada solicitudInventario
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		responderError(w, http.StatusBadRequest, "formato JSON invalido")
		return
	}

	nuevo := domain.Inventory{
		IdInventorio: entrada.IdInventorio,
		IdProducto:   entrada.IdProducto,
		Stock:        entrada.Stock,
		StockMin:     entrada.StockMin,
	}

	creado, err := c.servicio.CrearInventario(nuevo, entrada.Estrategia)
	if err != nil {
		responderError(w, http.StatusBadRequest, err.Error())
		return
	}
	responderJSON(w, http.StatusCreated, creado)
}

func (c *ControladorInventario) actualizarStock(w http.ResponseWriter, r *http.Request, idInventorio string) {
	var entrada solicitudInventario
	if err := json.NewDecoder(r.Body).Decode(&entrada); err != nil {
		responderError(w, http.StatusBadRequest, "formato JSON invalido")
		return
	}

	actualizado, err := c.servicio.ActualizarStock(idInventorio, entrada.Stock, entrada.StockMin, entrada.Estrategia)
	if err != nil {
		responderError(w, http.StatusBadRequest, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, actualizado)
}

func (c *ControladorInventario) eliminarInventario(w http.ResponseWriter, idInventorio string) {
	if err := c.servicio.EliminarInventario(idInventorio); err != nil {
		responderError(w, http.StatusNotFound, err.Error())
		return
	}
	responderJSON(w, http.StatusOK, map[string]string{"mensaje": "inventario eliminado"})
}
