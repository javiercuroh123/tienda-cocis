package inbound

import (
	"net/http"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// RegistrarMovimientos expone el historial y el registro de entradas, salidas y transferencias.
func RegistrarMovimientos(mux *http.ServeMux, servicio ports.MovementService) {
	mux.HandleFunc("GET /api/movements", func(w http.ResponseWriter, r *http.Request) {
		consulta := r.URL.Query()
		lista, err := servicio.Listar(consulta.Get("idProducto"), consulta.Get("idAlmacen"))
		if err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, http.StatusOK, lista)
	})
	mux.HandleFunc("POST /api/movements", func(w http.ResponseWriter, r *http.Request) {
		var solicitud domain.SolicitudMovimiento
		if !decodificar(w, r, &solicitud) {
			return
		}
		movimientos, err := servicio.Registrar(solicitud)
		if err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, http.StatusCreated, movimientos)
	})
}

type solicitudEstado struct {
	Estado       domain.EstadoEntrega `json:"estado"`
	IdTransporte string               `json:"idTransporte"`
}

type solicitudDetalles struct {
	Detalles []domain.DetalleEntrega `json:"detalles"`
}

// RegistrarEntregas expone la creación, edición de productos y cambios de estado de entregas.
func RegistrarEntregas(mux *http.ServeMux, servicio ports.DeliveryService) {
	responder := func(w http.ResponseWriter, entrega any, err error, codigo int) {
		if err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, codigo, entrega)
	}

	mux.HandleFunc("GET /api/deliveries", func(w http.ResponseWriter, r *http.Request) {
		lista, err := servicio.Listar()
		responder(w, lista, err, http.StatusOK)
	})
	mux.HandleFunc("POST /api/deliveries", func(w http.ResponseWriter, r *http.Request) {
		var entrada domain.Entrega
		if !decodificar(w, r, &entrada) {
			return
		}
		creada, err := servicio.Crear(entrada)
		responder(w, creada, err, http.StatusCreated)
	})
	mux.HandleFunc("PUT /api/deliveries/{id}/items", func(w http.ResponseWriter, r *http.Request) {
		var entrada solicitudDetalles
		if !decodificar(w, r, &entrada) {
			return
		}
		entrega, err := servicio.ActualizarDetalles(r.PathValue("id"), entrada.Detalles)
		responder(w, entrega, err, http.StatusOK)
	})
	mux.HandleFunc("POST /api/deliveries/{id}/estado", func(w http.ResponseWriter, r *http.Request) {
		var entrada solicitudEstado
		if !decodificar(w, r, &entrada) {
			return
		}
		entrega, err := servicio.CambiarEstado(r.PathValue("id"), entrada.Estado, entrada.IdTransporte)
		responder(w, entrega, err, http.StatusOK)
	})
}
