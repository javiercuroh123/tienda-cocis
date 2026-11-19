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
		instancia.verificarEsquema()
	})
	return instancia
}

func (d *DatabaseConnection) ObtenerConexion() *sql.DB {
	return d.conexion
}

// verificarEsquema avisa si falta la migración logística. El esquema lo crean
// db/init.sql y db/migrations/*.sql; la aplicación ya no crea tablas al arrancar.
func (d *DatabaseConnection) verificarEsquema() {
	var aplicada bool
	err := d.conexion.QueryRow(`SELECT EXISTS (SELECT 1 FROM schema_migraciones WHERE "version" = '001_logistica')`).Scan(&aplicada)
	if err != nil || !aplicada {
		log.Printf("Aviso: falta aplicar db/migrations/001_logistica.sql (ver README)")
	}
}
