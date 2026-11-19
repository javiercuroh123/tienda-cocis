package core

import (
	"testing"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

// fakeTx registra las llamadas en orden para verificar el trabajo enviado a la Unit of Work.
type fakeTx struct{ llamadas []string }

func (f *fakeTx) Sumar(p, a string, c int) error {
	f.llamadas = append(f.llamadas, "sumar:"+a)
	return nil
}
func (f *fakeTx) Restar(p, a string, c int) error {
	f.llamadas = append(f.llamadas, "restar:"+a)
	return nil
}
func (f *fakeTx) RegistrarMovimiento(m domain.Movimiento) error {
	f.llamadas = append(f.llamadas, "mov:"+m.Tipo)
	return nil
}

type fakeUoW struct {
	tx    *fakeTx
	usada bool
}

func (u *fakeUoW) Ejecutar(trabajo func(ports.InventarioTx) error) error {
	u.usada = true
	return trabajo(u.tx)
}

func TestRegistrarRechazaSolicitudesInvalidas(t *testing.T) {
	uow := &fakeUoW{tx: &fakeTx{}}
	s := NuevoServicioMovimiento(uow, nil)
	casos := []domain.SolicitudMovimiento{
		{Tipo: "salida", IdProducto: "p", IdAlmacen: "a", IdUsuario: "u", Cantidad: 0},
		{Tipo: "otro", IdProducto: "p", IdAlmacen: "a", IdUsuario: "u", Cantidad: 1},
		{Tipo: "transferencia", IdProducto: "p", IdAlmacen: "a", IdAlmacenDestino: "a", IdUsuario: "u", Cantidad: 1},
		{Tipo: "entrada", IdProducto: "p", IdAlmacen: "a", Cantidad: 1},
	}
	for _, c := range casos {
		if _, err := s.Registrar(c); err == nil {
			t.Errorf("deberia rechazar %+v", c)
		}
	}
	if uow.usada {
		t.Error("una solicitud invalida no debe abrir transaccion")
	}
}

func TestTransferenciaVinculaSalidaYEntrada(t *testing.T) {
	uow := &fakeUoW{tx: &fakeTx{}}
	movs, err := NuevoServicioMovimiento(uow, nil).Registrar(domain.SolicitudMovimiento{
		Tipo: "transferencia", IdProducto: "p", IdAlmacen: "origen", IdAlmacenDestino: "destino", IdUsuario: "u", Cantidad: 4,
	})
	if err != nil {
		t.Fatal(err)
	}
	esperado := []string{"restar:origen", "mov:salida", "sumar:destino", "mov:entrada"}
	if len(uow.tx.llamadas) != 4 {
		t.Fatalf("llamadas = %v", uow.tx.llamadas)
	}
	for i := range esperado {
		if uow.tx.llamadas[i] != esperado[i] {
			t.Fatalf("orden = %v, esperado %v", uow.tx.llamadas, esperado)
		}
	}
	if movs[0].IdTransferencia == nil || *movs[0].IdTransferencia != *movs[1].IdTransferencia {
		t.Error("salida y entrada deben compartir idTransferencia")
	}
}

func TestEntradaAplicaEstrategiaVolumen(t *testing.T) {
	movs, err := NuevoServicioMovimiento(&fakeUoW{tx: &fakeTx{}}, nil).Registrar(domain.SolicitudMovimiento{
		Tipo: "entrada", IdProducto: "p", IdAlmacen: "a", IdUsuario: "u", Cantidad: 20, Estrategia: "volumen",
	})
	if err != nil {
		t.Fatal(err)
	}
	if movs[0].Cantidad != 22 {
		t.Errorf("cantidad con bonificacion = %d, esperado 22", movs[0].Cantidad)
	}
}
