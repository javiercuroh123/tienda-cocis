package inbound

import (
	"encoding/json"
	"errors"
	"net/http"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// responderErrorDe usa el tipo del error de negocio para elegir el código HTTP.
// Los errores sin clasificar conservan el código por defecto de cada ruta.
func responderErrorDe(w http.ResponseWriter, err error, codigoPorDefecto int) {
	var negocio *domain.ErrorNegocio
	if errors.As(err, &negocio) {
		codigo := map[domain.TipoError]int{
			domain.ErrorValidacion:   http.StatusBadRequest,
			domain.ErrorNoEncontrado: http.StatusNotFound,
			domain.ErrorConflicto:    http.StatusConflict,
		}[negocio.Tipo]
		responderError(w, codigo, negocio.Mensaje)
		return
	}
	responderError(w, codigoPorDefecto, err.Error())
}

// decodificar lee el cuerpo JSON y responde 400 si es inválido.
func decodificar(w http.ResponseWriter, r *http.Request, destino any) bool {
	if err := json.NewDecoder(r.Body).Decode(destino); err != nil {
		responderError(w, http.StatusBadRequest, "formato JSON invalido")
		return false
	}
	return true
}

// RegistrarCatalogo expone GET/POST {ruta} y PUT/DELETE {ruta}/{id} para un catálogo.
func RegistrarCatalogo[T any](mux *http.ServeMux, ruta string, servicio ports.CatalogService[T]) {
	mux.HandleFunc("GET "+ruta, func(w http.ResponseWriter, r *http.Request) {
		lista, err := servicio.Listar()
		if err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, http.StatusOK, lista)
	})
	mux.HandleFunc("POST "+ruta, func(w http.ResponseWriter, r *http.Request) {
		var entrada T
		if !decodificar(w, r, &entrada) {
			return
		}
		creado, err := servicio.Crear(entrada)
		if err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, http.StatusCreated, creado)
	})
	mux.HandleFunc("PUT "+ruta+"/{id}", func(w http.ResponseWriter, r *http.Request) {
		var entrada T
		if !decodificar(w, r, &entrada) {
			return
		}
		actualizado, err := servicio.Actualizar(r.PathValue("id"), entrada)
		if err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, http.StatusOK, actualizado)
	})
	mux.HandleFunc("DELETE "+ruta+"/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := servicio.Eliminar(r.PathValue("id")); err != nil {
			responderErrorDe(w, err, http.StatusInternalServerError)
			return
		}
		responderJSON(w, http.StatusOK, map[string]string{"mensaje": "registro eliminado"})
	})
}
