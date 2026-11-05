package domain

import "time"

type Inventory struct {
	IdInventorio        string    `json:"idInventorio"`
	IdProducto          string    `json:"idProducto"`
	NombreProducto      string    `json:"nombreProducto,omitempty"`
	PrecioUnidad        float64   `json:"precioUnidad,omitempty"`
	Stock               int       `json:"stock"`
	StockMin            int       `json:"stockMin"`
	UltimaActualizacion time.Time `json:"ultimaActualizacion"`
	EstrategiaAplicada  string    `json:"estrategiaAplicada,omitempty"`
	ValorCalculado      float64   `json:"valorCalculado,omitempty"`
}
