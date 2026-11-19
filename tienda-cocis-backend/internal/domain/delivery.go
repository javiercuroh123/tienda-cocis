package domain

import (
	"strings"
	"time"
)

// EstadoEntrega implementa una versión básica del patrón State: un tipo de estado
// y una tabla de transiciones permitidas.
type EstadoEntrega string

const (
	Pendiente  EstadoEntrega = "pendiente"
	Asignada   EstadoEntrega = "asignada"
	EnTransito EstadoEntrega = "en_transito"
	Entregada  EstadoEntrega = "entregada"
	Cancelada  EstadoEntrega = "cancelada"
)

var transiciones = map[EstadoEntrega][]EstadoEntrega{
	Pendiente:  {Asignada, Cancelada},
	Asignada:   {EnTransito, Cancelada},
	EnTransito: {Entregada},
}

// Siguientes devuelve los estados alcanzables (la interfaz los usa para mostrar acciones).
func (e EstadoEntrega) Siguientes() []EstadoEntrega {
	if s := transiciones[e]; s != nil {
		return s
	}
	return []EstadoEntrega{}
}

func ValidarTransicion(actual, nuevo EstadoEntrega) error {
	for _, permitido := range transiciones[actual] {
		if permitido == nuevo {
			return nil
		}
	}
	return Conflicto("transicion no permitida: " + string(actual) + " -> " + string(nuevo))
}

type DetalleEntrega struct {
	IdProducto     string `json:"idProducto"`
	NombreProducto string `json:"nombreProducto,omitempty"`
	Cantidad       int    `json:"cantidad"`
}

type Entrega struct {
	IdEntrega    string           `json:"idEntrega"`
	IdTransporte *string          `json:"idTransporte"`
	Placa        string           `json:"placa,omitempty"`
	Destinatario string           `json:"destinatario"`
	Direccion    string           `json:"direccion"`
	Fecha        string           `json:"fecha"` // AAAA-MM-DD
	Estado       EstadoEntrega    `json:"estado"`
	Siguientes   []EstadoEntrega  `json:"siguientes"`
	Detalles     []DetalleEntrega `json:"detalles"`
}

func ValidarDetalles(detalles []DetalleEntrega) error {
	if len(detalles) == 0 {
		return Invalido("la entrega necesita al menos un producto")
	}
	vistos := map[string]bool{}
	for _, d := range detalles {
		if d.IdProducto == "" || d.Cantidad <= 0 {
			return Invalido("cada producto necesita una cantidad mayor a cero")
		}
		if vistos[d.IdProducto] {
			return Invalido("un producto aparece dos veces en la entrega")
		}
		vistos[d.IdProducto] = true
	}
	return nil
}

func (e *Entrega) Normalizar() error {
	e.Destinatario, e.Direccion = strings.TrimSpace(e.Destinatario), strings.TrimSpace(e.Direccion)
	if e.Destinatario == "" || e.Direccion == "" {
		return Invalido("el destinatario y la direccion son obligatorios")
	}
	if _, err := time.Parse("2006-01-02", e.Fecha); err != nil {
		return Invalido("la fecha debe tener el formato AAAA-MM-DD")
	}
	return ValidarDetalles(e.Detalles)
}
