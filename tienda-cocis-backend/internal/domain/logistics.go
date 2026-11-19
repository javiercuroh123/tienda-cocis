package domain

import (
	"strings"
	"time"
)

type Usuario struct {
	IdUsuario string `json:"idUsuario"`
	Nombre    string `json:"nombre"`
	Correo    string `json:"correo"`
}

type Proveedor struct {
	IdProveedor string   `json:"idProveedor"`
	Nombre      string   `json:"nombre"`
	Telefono    string   `json:"telefono"`
	Productos   []string `json:"productos"` // idProducto asociados (producto_proveedor)
}

type Almacen struct {
	IdAlmacen string `json:"idAlmacen"`
	Nombre    string `json:"nombre"`
	Direccion string `json:"direccion"`
}

type Transporte struct {
	IdTransporte string `json:"idTransporte"`
	Placa        string `json:"placa"`
	Conductor    string `json:"conductor"`
	Tipo         string `json:"tipo"`
}

// Las funciones Normalizar recortan espacios y validan campos obligatorios.
// Identificador permite al servicio genérico de catálogos asignar el id.

func (u *Usuario) Identificador() *string { return &u.IdUsuario }
func (u *Usuario) Normalizar() error {
	u.Nombre, u.Correo = strings.TrimSpace(u.Nombre), strings.ToLower(strings.TrimSpace(u.Correo))
	if u.Nombre == "" {
		return Invalido("el nombre es obligatorio")
	}
	if !strings.Contains(u.Correo, "@") {
		return Invalido("el correo no es valido")
	}
	return nil
}

func (p *Proveedor) Identificador() *string { return &p.IdProveedor }
func (p *Proveedor) Normalizar() error {
	p.Nombre, p.Telefono = strings.TrimSpace(p.Nombre), strings.TrimSpace(p.Telefono)
	if p.Nombre == "" || p.Telefono == "" {
		return Invalido("el nombre y el telefono son obligatorios")
	}
	if p.Productos == nil {
		p.Productos = []string{}
	}
	return nil
}

func (a *Almacen) Identificador() *string { return &a.IdAlmacen }
func (a *Almacen) Normalizar() error {
	a.Nombre, a.Direccion = strings.TrimSpace(a.Nombre), strings.TrimSpace(a.Direccion)
	if a.Nombre == "" || a.Direccion == "" {
		return Invalido("el nombre y la direccion son obligatorios")
	}
	return nil
}

var TiposTransporte = map[string]bool{"camion": true, "furgoneta": true, "moto": true}

func (t *Transporte) Identificador() *string { return &t.IdTransporte }
func (t *Transporte) Normalizar() error {
	t.Placa, t.Conductor = strings.ToUpper(strings.TrimSpace(t.Placa)), strings.TrimSpace(t.Conductor)
	if t.Placa == "" || t.Conductor == "" {
		return Invalido("la placa y el conductor son obligatorios")
	}
	if !TiposTransporte[t.Tipo] {
		return Invalido("el tipo debe ser camion, furgoneta o moto")
	}
	return nil
}

// Movimiento es una fila del historial; las cantidades solo cambian mediante movimientos.
type Movimiento struct {
	IdMovimiento    string    `json:"idMovimiento"`
	IdProducto      string    `json:"idProducto"`
	NombreProducto  string    `json:"nombreProducto,omitempty"`
	IdAlmacen       string    `json:"idAlmacen"`
	NombreAlmacen   string    `json:"nombreAlmacen,omitempty"`
	IdUsuario       string    `json:"idUsuario"`
	NombreUsuario   string    `json:"nombreUsuario,omitempty"`
	Tipo            string    `json:"tipo"` // entrada | salida
	Cantidad        int       `json:"cantidad"`
	FechaHora       time.Time `json:"fechaHora"`
	IdTransferencia *string   `json:"idTransferencia"`
}

// SolicitudMovimiento es la orden de entrada, salida o transferencia.
type SolicitudMovimiento struct {
	Tipo             string `json:"tipo"` // entrada | salida | transferencia
	IdProducto       string `json:"idProducto"`
	IdAlmacen        string `json:"idAlmacen"`        // origen en transferencias
	IdAlmacenDestino string `json:"idAlmacenDestino"` // solo transferencias
	IdUsuario        string `json:"idUsuario"`
	Cantidad         int    `json:"cantidad"`
	Estrategia       string `json:"estrategia"` // solo entradas (Strategy: bonificación por volumen)
}

func (s SolicitudMovimiento) Validar() error {
	if s.IdProducto == "" || s.IdAlmacen == "" || s.IdUsuario == "" {
		return Invalido("producto, almacen y usuario son obligatorios")
	}
	if s.Cantidad <= 0 {
		return Invalido("la cantidad debe ser mayor a cero")
	}
	switch s.Tipo {
	case "entrada", "salida":
		return nil
	case "transferencia":
		if s.IdAlmacenDestino == "" || s.IdAlmacenDestino == s.IdAlmacen {
			return Invalido("la transferencia requiere un almacen de destino distinto al de origen")
		}
		return nil
	}
	return Invalido("el tipo debe ser entrada, salida o transferencia")
}
