package domain

import "testing"

func TestEstrategiasInventario(t *testing.T) {
	estandar := SeleccionarEstrategia("estandar")
	if valor := estandar.CalcularValor(10, 100.0); valor != 1000.0 {
		t.Fatalf("esperaba 1000.0 en estandar, obtuvo %v", valor)
	}

	liquidacion := SeleccionarEstrategia("liquidacion")
	if valor := liquidacion.CalcularValor(10, 100.0); valor != 700.0 {
		t.Fatalf("esperaba 700.0 en liquidacion, obtuvo %v", valor)
	}

	volumen := SeleccionarEstrategia("volumen")
	if stockBonificado := volumen.CalcularStock(20); stockBonificado != 22 {
		t.Fatalf("esperaba 22 en bonificacion por volumen, obtuvo %v", stockBonificado)
	}
}
