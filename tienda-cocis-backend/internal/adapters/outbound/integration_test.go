package outbound_test

// Pruebas de integración contra PostgreSQL real. Se omiten si TEST_DATABASE_URL no está definida.
// Usar SIEMPRE una base desechable con db/init.sql + db/migrations aplicados (ver README).

import (
	"errors"
	"os"
	"sync"
	"testing"
	"tienda-cocis-backend/internal/adapters/outbound"
	"tienda-cocis-backend/internal/core"
	"tienda-cocis-backend/internal/domain"
	"tienda-cocis-backend/internal/ports"
)

type entorno struct {
	db          *outbound.DatabaseConnection
	movimientos ports.MovementService
	entregas    ports.DeliveryService
	productos   ports.ProductService
	almacenes   ports.CatalogService[domain.Almacen]
	transportes ports.CatalogService[domain.Transporte]
	usuarios    ports.CatalogService[domain.Usuario]
}

func preparar(t *testing.T) *entorno {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL no definida; se omiten las pruebas de integracion")
	}
	os.Setenv("DATABASE_URL", url)
	db := outbound.ObtenerInstancia() // Singleton: el mismo pool para todos los adaptadores
	return &entorno{
		db:          db,
		movimientos: core.NuevoServicioMovimiento(outbound.NuevaUnidadDeTrabajo(db), outbound.NuevoRepositorioMovimiento(db)),
		entregas:    core.NuevoServicioEntrega(outbound.NuevoRepositorioEntrega(db)),
		productos:   core.NuevoServicioProducto(outbound.NuevoRepositorioProducto(db)),
		almacenes:   core.NuevoServicioCatalogo[domain.Almacen](outbound.NuevoRepositorioAlmacen(db), "alm"),
		transportes: core.NuevoServicioCatalogo[domain.Transporte](outbound.NuevoRepositorioTransporte(db), "trp"),
		usuarios:    core.NuevoServicioCatalogo[domain.Usuario](outbound.NuevoRepositorioUsuario(db), "usr"),
	}
}

// escenario crea un producto y dos almacenes propios para que cada prueba sea independiente.
func (e *entorno) escenario(t *testing.T) (producto, origen, destino string) {
	t.Helper()
	p, err := e.productos.CrearProducto(domain.Product{NombreProducto: "Prueba " + t.Name(), PrecioUnidad: 10, Categoria: "Pruebas"})
	if err != nil {
		t.Fatal(err)
	}
	a1, err := e.almacenes.Crear(domain.Almacen{Nombre: "Origen " + p.IdProducto, Direccion: "Calle 1"})
	if err != nil {
		t.Fatal(err)
	}
	a2, err := e.almacenes.Crear(domain.Almacen{Nombre: "Destino " + p.IdProducto, Direccion: "Calle 2"})
	if err != nil {
		t.Fatal(err)
	}
	return p.IdProducto, a1.IdAlmacen, a2.IdAlmacen
}

func (e *entorno) cantidad(t *testing.T, producto, almacen string) int {
	t.Helper()
	var c int
	err := e.db.ObtenerConexion().QueryRow(
		`SELECT COALESCE((SELECT "cantidad" FROM inventario WHERE "idProducto" = $1 AND "idAlmacen" = $2), -1)`,
		producto, almacen).Scan(&c)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func (e *entorno) contarMovimientos(t *testing.T, producto string) int {
	t.Helper()
	var n int
	if err := e.db.ObtenerConexion().QueryRow(`SELECT count(*) FROM movimientos WHERE "idProducto" = $1`, producto).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func esConflicto(err error) bool {
	var negocio *domain.ErrorNegocio
	return errors.As(err, &negocio) && negocio.Tipo == domain.ErrorConflicto
}

func entrada(producto, almacen string, cantidad int) domain.SolicitudMovimiento {
	return domain.SolicitudMovimiento{Tipo: "entrada", IdProducto: producto, IdAlmacen: almacen, IdUsuario: "usr-admin", Cantidad: cantidad}
}

func TestMigracionConservaCantidadesYStockMinimo(t *testing.T) {
	e := preparar(t)
	var diferencias int
	err := e.db.ObtenerConexion().QueryRow(`
		SELECT count(*) FROM almacen a
		LEFT JOIN inventario i ON i."idInventorio" = a."idInventorio"
		WHERE i."idInventorio" IS NULL OR i."idAlmacen" <> 'alm-principal'
		   OR i."stockMin" <> a."stockMin" OR i."idProducto" <> a."idProducto"`).Scan(&diferencias)
	if err != nil {
		t.Fatal(err)
	}
	if diferencias != 0 {
		t.Fatalf("%d filas de almacen no coinciden con inventario", diferencias)
	}
}

func TestEntradaAumentaStockYCreaMovimiento(t *testing.T) {
	e := preparar(t)
	producto, almacen, _ := e.escenario(t)

	if _, err := e.movimientos.Registrar(entrada(producto, almacen, 15)); err != nil {
		t.Fatal(err)
	}
	if _, err := e.movimientos.Registrar(entrada(producto, almacen, 5)); err != nil {
		t.Fatal(err)
	}
	if c := e.cantidad(t, producto, almacen); c != 20 {
		t.Errorf("cantidad = %d, esperado 20", c)
	}
	if n := e.contarMovimientos(t, producto); n != 2 {
		t.Errorf("movimientos = %d, esperado 2", n)
	}
}

func TestSalidaSinStockSeRechazaYConservaSaldo(t *testing.T) {
	e := preparar(t)
	producto, almacen, _ := e.escenario(t)
	if _, err := e.movimientos.Registrar(entrada(producto, almacen, 3)); err != nil {
		t.Fatal(err)
	}

	salida := domain.SolicitudMovimiento{Tipo: "salida", IdProducto: producto, IdAlmacen: almacen, IdUsuario: "usr-admin", Cantidad: 5}
	if _, err := e.movimientos.Registrar(salida); !esConflicto(err) {
		t.Fatalf("esperaba conflicto por stock insuficiente, obtuvo %v", err)
	}
	if c := e.cantidad(t, producto, almacen); c != 3 {
		t.Errorf("cantidad = %d, esperado 3", c)
	}
	if n := e.contarMovimientos(t, producto); n != 1 {
		t.Errorf("movimientos = %d, esperado 1 (solo la entrada)", n)
	}
}

func TestFalloAlRegistrarMovimientoRevierteStock(t *testing.T) {
	e := preparar(t)
	producto, almacen, _ := e.escenario(t)
	if _, err := e.movimientos.Registrar(entrada(producto, almacen, 10)); err != nil {
		t.Fatal(err)
	}

	// El stock se suma primero; luego el INSERT del movimiento falla por usuario inexistente.
	solicitud := entrada(producto, almacen, 7)
	solicitud.IdUsuario = "usr-no-existe"
	if _, err := e.movimientos.Registrar(solicitud); err == nil {
		t.Fatal("esperaba error por usuario inexistente")
	}
	if c := e.cantidad(t, producto, almacen); c != 10 {
		t.Errorf("cantidad = %d, esperado 10 (el cambio debio revertirse)", c)
	}
}

func TestTransferenciaActualizaOrigenYDestino(t *testing.T) {
	e := preparar(t)
	producto, origen, destino := e.escenario(t)
	if _, err := e.movimientos.Registrar(entrada(producto, origen, 10)); err != nil {
		t.Fatal(err)
	}

	transferencia := domain.SolicitudMovimiento{Tipo: "transferencia", IdProducto: producto, IdAlmacen: origen,
		IdAlmacenDestino: destino, IdUsuario: "usr-admin", Cantidad: 4}
	movs, err := e.movimientos.Registrar(transferencia)
	if err != nil {
		t.Fatal(err)
	}
	if o, d := e.cantidad(t, producto, origen), e.cantidad(t, producto, destino); o != 6 || d != 4 {
		t.Errorf("origen=%d destino=%d, esperado 6 y 4", o, d)
	}
	if *movs[0].IdTransferencia != *movs[1].IdTransferencia {
		t.Error("los movimientos de la transferencia deben estar vinculados")
	}

	// Una transferencia mayor al saldo no debe tocar ninguno de los dos almacenes.
	transferencia.Cantidad = 50
	if _, err := e.movimientos.Registrar(transferencia); !esConflicto(err) {
		t.Fatalf("esperaba conflicto, obtuvo %v", err)
	}
	if o, d := e.cantidad(t, producto, origen), e.cantidad(t, producto, destino); o != 6 || d != 4 {
		t.Errorf("tras el rechazo origen=%d destino=%d, esperado 6 y 4", o, d)
	}
}

func TestSalidasConcurrentesNoDejanSaldoNegativo(t *testing.T) {
	e := preparar(t)
	producto, almacen, _ := e.escenario(t)
	if _, err := e.movimientos.Registrar(entrada(producto, almacen, 10)); err != nil {
		t.Fatal(err)
	}

	var wg sync.WaitGroup
	errores := make([]error, 5)
	for i := range errores {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, errores[i] = e.movimientos.Registrar(domain.SolicitudMovimiento{
				Tipo: "salida", IdProducto: producto, IdAlmacen: almacen, IdUsuario: "usr-admin", Cantidad: 3})
		}(i)
	}
	wg.Wait()

	exitosas := 0
	for _, err := range errores {
		if err == nil {
			exitosas++
		} else if !esConflicto(err) {
			t.Errorf("error inesperado: %v", err)
		}
	}
	if exitosas != 3 || e.cantidad(t, producto, almacen) != 1 {
		t.Errorf("exitosas=%d cantidad=%d, esperado 3 y 1", exitosas, e.cantidad(t, producto, almacen))
	}
}

func TestEntregaFlujoCompleto(t *testing.T) {
	e := preparar(t)
	producto, _, _ := e.escenario(t)
	vehiculo, err := e.transportes.Crear(domain.Transporte{Placa: "T-" + producto[5:], Conductor: "Ana", Tipo: "furgoneta"})
	if err != nil {
		t.Fatal(err)
	}

	creada, err := e.entregas.Crear(domain.Entrega{Destinatario: "Cliente", Direccion: "Av. Lima 123", Fecha: "2026-11-20",
		Detalles: []domain.DetalleEntrega{{IdProducto: producto, Cantidad: 2}}})
	if err != nil {
		t.Fatal(err)
	}
	if creada.Estado != domain.Pendiente || len(creada.Detalles) != 1 || creada.Detalles[0].Cantidad != 2 {
		t.Fatalf("entrega creada incorrecta: %+v", creada)
	}

	if _, err := e.entregas.CambiarEstado(creada.IdEntrega, domain.Entregada, ""); !esConflicto(err) {
		t.Errorf("pendiente -> entregada deberia ser conflicto, obtuvo %v", err)
	}
	if _, err := e.entregas.CambiarEstado(creada.IdEntrega, domain.Asignada, ""); err == nil {
		t.Error("asignar sin vehiculo deberia fallar")
	}

	asignada, err := e.entregas.CambiarEstado(creada.IdEntrega, domain.Asignada, vehiculo.IdTransporte)
	if err != nil {
		t.Fatal(err)
	}
	if asignada.IdTransporte == nil || *asignada.IdTransporte != vehiculo.IdTransporte {
		t.Fatalf("vehiculo no asignado: %+v", asignada)
	}
	for _, estado := range []domain.EstadoEntrega{domain.EnTransito, domain.Entregada} {
		if _, err := e.entregas.CambiarEstado(creada.IdEntrega, estado, ""); err != nil {
			t.Fatalf("transicion a %s: %v", estado, err)
		}
	}
	if _, err := e.entregas.ActualizarDetalles(creada.IdEntrega, []domain.DetalleEntrega{{IdProducto: producto, Cantidad: 1}}); !esConflicto(err) {
		t.Errorf("editar productos de una entrega entregada deberia ser conflicto, obtuvo %v", err)
	}

	// Un transporte usado por una entrega no se puede eliminar.
	if err := e.transportes.Eliminar(vehiculo.IdTransporte); !esConflicto(err) {
		t.Errorf("eliminar transporte referenciado deberia ser conflicto, obtuvo %v", err)
	}
}

func TestEliminarProductoReferenciadoEsConflicto(t *testing.T) {
	e := preparar(t)
	producto, almacen, _ := e.escenario(t)
	if _, err := e.movimientos.Registrar(entrada(producto, almacen, 1)); err != nil {
		t.Fatal(err)
	}
	if err := e.productos.EliminarProducto(producto); !esConflicto(err) {
		t.Errorf("esperaba conflicto, obtuvo %v", err)
	}
}

func TestCorreoDuplicadoEsConflicto(t *testing.T) {
	e := preparar(t)
	if _, err := e.usuarios.Crear(domain.Usuario{Nombre: "Otro", Correo: "ADMIN@tiendacocis.local"}); !esConflicto(err) {
		t.Errorf("esperaba conflicto por correo duplicado, obtuvo %v", err)
	}
}
