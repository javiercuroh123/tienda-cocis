package domain

import "math"

// InventoryStrategy define el contrato del Patrón Strategy para el cálculo y actualización de inventario.
type InventoryStrategy interface {
	CalcularValor(stock int, precioUnidad float64) float64
	CalcularStock(stock int) int
	ObtenerNombre() string
}

// StandardStrategy aplica cálculo directo sin alteraciones.
type StandardStrategy struct{}

func (e *StandardStrategy) CalcularValor(stock int, precioUnidad float64) float64 {
	valor := float64(stock) * precioUnidad
	return math.Round(valor*100) / 100
}

func (e *StandardStrategy) CalcularStock(stock int) int {
	return stock
}

func (e *StandardStrategy) ObtenerNombre() string {
	return "estandar"
}

// LiquidacionStrategy aplica una depreciación del 30% sobre el precio unitario en almacén.
type LiquidacionStrategy struct{}

func (e *LiquidacionStrategy) CalcularValor(stock int, precioUnidad float64) float64 {
	valor := float64(stock) * (precioUnidad * 0.70)
	return math.Round(valor*100) / 100
}

func (e *LiquidacionStrategy) CalcularStock(stock int) int {
	return stock
}

func (e *LiquidacionStrategy) ObtenerNombre() string {
	return "liquidacion"
}

// VolumenStrategy contempla bonificaciones en cantidad (+10% en stock al superar 20 unidades y 10% descuento en valoración).
type VolumenStrategy struct{}

func (e *VolumenStrategy) CalcularValor(stock int, precioUnidad float64) float64 {
	factor := 1.0
	if stock >= 20 {
		factor = 0.90
	}
	valor := float64(stock) * (precioUnidad * factor)
	return math.Round(valor*100) / 100
}

func (e *VolumenStrategy) CalcularStock(stock int) int {
	if stock >= 20 {
		return stock + (stock / 10)
	}
	return stock
}

func (e *VolumenStrategy) ObtenerNombre() string {
	return "volumen"
}

func SeleccionarEstrategia(tipo string) InventoryStrategy {
	switch tipo {
	case "liquidacion":
		return &LiquidacionStrategy{}
	case "volumen":
		return &VolumenStrategy{}
	default:
		return &StandardStrategy{}
	}
}
