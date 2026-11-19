package domain

import "testing"

func TestTransicionesEntrega(t *testing.T) {
	validas := [][2]EstadoEntrega{
		{Pendiente, Asignada}, {Asignada, EnTransito}, {EnTransito, Entregada},
		{Pendiente, Cancelada}, {Asignada, Cancelada},
	}
	for _, par := range validas {
		if err := ValidarTransicion(par[0], par[1]); err != nil {
			t.Errorf("%s -> %s deberia permitirse: %v", par[0], par[1], err)
		}
	}
	invalidas := [][2]EstadoEntrega{
		{Pendiente, Entregada}, {Pendiente, EnTransito}, {EnTransito, Cancelada},
		{Entregada, Cancelada}, {Cancelada, Pendiente}, {Asignada, Pendiente},
	}
	for _, par := range invalidas {
		if err := ValidarTransicion(par[0], par[1]); err == nil {
			t.Errorf("%s -> %s deberia rechazarse", par[0], par[1])
		}
	}
}

func TestValidarDetalles(t *testing.T) {
	if ValidarDetalles(nil) == nil {
		t.Error("una entrega sin productos deberia rechazarse")
	}
	if ValidarDetalles([]DetalleEntrega{{IdProducto: "p1", Cantidad: 0}}) == nil {
		t.Error("cantidad cero deberia rechazarse")
	}
	if ValidarDetalles([]DetalleEntrega{{IdProducto: "p1", Cantidad: 1}, {IdProducto: "p1", Cantidad: 2}}) == nil {
		t.Error("producto repetido deberia rechazarse")
	}
}
