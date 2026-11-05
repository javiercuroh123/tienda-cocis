package domain

type Product struct {
	IdProducto     string  `json:"idProducto"`
	NombreProducto string  `json:"nombreProducto"`
	PrecioUnidad   float64 `json:"precioUnidad"`
	Categoria      string  `json:"categoria"`
}
