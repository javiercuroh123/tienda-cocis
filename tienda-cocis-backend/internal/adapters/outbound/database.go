package outbound

import (
	"database/sql"
	"log"
	"os"
	"sync"

	_ "github.com/lib/pq"
)

// DatabaseConnection aplica el Patrón Singleton para gestionar la conexión única a PostgreSQL.
type DatabaseConnection struct {
	connectionString string
	conexion         *sql.DB
}

var (
	instancia *DatabaseConnection
	unaVez    sync.Once
)

// ObtenerInstancia devuelve la instancia única global de DatabaseConnection usando sync.Once.
func ObtenerInstancia() *DatabaseConnection {
	unaVez.Do(func() {
		cadena := os.Getenv("DATABASE_URL")
		if cadena == "" {
			cadena = "postgres://cocis:cocis123@localhost:5434/tiendacocis?sslmode=disable"
		}

		db, err := sql.Open("postgres", cadena)
		if err != nil {
			log.Fatalf("Error abriendo conexion PostgreSQL: %v", err)
		}

		if err := db.Ping(); err != nil {
			log.Printf("Aviso: ping inicial a PostgreSQL: %v", err)
		}

		instancia = &DatabaseConnection{
			connectionString: cadena,
			conexion:         db,
		}
		instancia.inicializarTablas()
	})
	return instancia
}

func (d *DatabaseConnection) ObtenerConexion() *sql.DB {
	return d.conexion
}

func (d *DatabaseConnection) inicializarTablas() {
	esquema := `
	CREATE TABLE IF NOT EXISTS productos (
		"idProducto" VARCHAR(64) PRIMARY KEY,
		"nombreProducto" VARCHAR(150) NOT NULL,
		"precioUnidad" DOUBLE PRECISION NOT NULL,
		"categoria" VARCHAR(100) NOT NULL
	);

	CREATE TABLE IF NOT EXISTS almacen (
		"idInventorio" VARCHAR(64) PRIMARY KEY,
		"idProducto" VARCHAR(64) NOT NULL UNIQUE REFERENCES productos("idProducto") ON DELETE CASCADE,
		"stock" INTEGER NOT NULL DEFAULT 0,
		"stockMin" INTEGER NOT NULL DEFAULT 5,
		"ultimaActualizacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := d.conexion.Exec(esquema); err != nil {
		log.Printf("Error inicializando tablas: %v", err)
	}
}
