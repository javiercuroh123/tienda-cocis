package inbound

import (
	"net/http"
	"strings"
	"tienda-cocis-backend/internal/ports"
)

type ControladorInventario struct {
	servicio ports.InventoryService
}

func NuevoControladorInventario(servicio ports.InventoryService) *ControladorInventario {
	return &ControladorInventario{servicio: servicio}
}

// solicitudInventario: solo el stock mínimo es editable; la cantidad cambia con /api/movements.
type solicitudInventario struct {
	StockMin   int    `json:"stockMin"`
	Estrategia string `json:"estrategia"`
}

func (c *ControladorInventario) ManejarInventario(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		responderError(w, http.StatusMethodNotAllowed, "metodo no permitido; registra existencias en /api/movements")
		return
	}
	consulta := r.URL.Query()
	registros, err := c.servicio.ListarInventario(consulta.Get("estrategia"), consulta.Get("idAlmacen"))
	if err != nil {
		responderErrorDe(w, err, http.StatusInternalServerError)
		return
	}
	responderJSON(w, http.StatusOK, registros)
}

func (c *ControladorInventario) ManejarInventarioPorId(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/inventory/")
	if id == "" {
		responderError(w, http.StatusBadRequest, "idInventorio requerido")
		return
	}
	estrategia := r.URL.Query().Get("estrategia")

	switch r.Method {
	case http.MethodGet:
		registro, err := c.servicio.ObtenerInventario(id, estrategia)
		if err != nil {
			responderErrorDe(w, err, http.StatusNotFound)
			return
		}
		responderJSON(w, http.StatusOK, registro)
	case http.MethodPut:
		var entrada solicitudInventario
		if !decodificar(w, r, &entrada) {
			return
		}
		actualizado, err := c.servicio.ActualizarStockMinimo(id, entrada.StockMin, entrada.Estrategia)
		if err != nil {
			responderErrorDe(w, err, http.StatusBadRequest)
			return
		}
		responderJSON(w, http.StatusOK, actualizado)
	case http.MethodDelete:
		if err := c.servicio.EliminarInventario(id); err != nil {
			responderErrorDe(w, err, http.StatusNotFound)
			return
		}
		responderJSON(w, http.StatusOK, map[string]string{"mensaje": "inventario eliminado"})
	default:
		responderError(w, http.StatusMethodNotAllowed, "metodo no permitido")
	}
}
