package main

import (
	"log"
	"net/http"
	"os"
	"tienda-cocis-backend/internal/adapters/inbound"
	"tienda-cocis-backend/internal/adapters/outbound"
	"tienda-cocis-backend/internal/core"
)

func habilitarCORS(siguiente http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		siguiente.ServeHTTP(w, r)
	})
}

func iniciarServidor() {
	// 1. Adaptador secundario: Instancia única de base de datos (Patrón Singleton)
	conexionDB := outbound.ObtenerInstancia()

	// 2. Adaptadores secundarios: Repositorios PostgreSQL
	repoProducto := outbound.NuevoRepositorioProducto(conexionDB)
	repoInventario := outbound.NuevoRepositorioInventario(conexionDB)

	// 3. Núcleo / Casos de uso (conectados mediante Puertos)
	servicioProducto := core.NuevoServicioProducto(repoProducto)
	servicioInventario := core.NuevoServicioInventario(repoInventario, repoProducto)

	// 4. Adaptadores primarios: Controladores HTTP
	controladorProducto := inbound.NuevoControladorProducto(servicioProducto)
	controladorInventario := inbound.NuevoControladorInventario(servicioInventario)

	enrutador := http.NewServeMux()
	enrutador.HandleFunc("/api/products", controladorProducto.ManejarProductos)
	enrutador.HandleFunc("/api/products/", controladorProducto.ManejarProductoPorId)
	enrutador.HandleFunc("/api/inventory", controladorInventario.ManejarInventario)
	enrutador.HandleFunc("/api/inventory/", controladorInventario.ManejarInventarioPorId)

	puerto := os.Getenv("PORT")
	if puerto == "" {
		puerto = "8080"
	}

	log.Printf("Servidor TiendaCocis ejecutandose en http://localhost:%s", puerto)
	if err := http.ListenAndServe(":"+puerto, habilitarCORS(enrutador)); err != nil {
		log.Fatalf("Error en el servidor: %v", err)
	}
}

func main() {
	iniciarServidor()
}
