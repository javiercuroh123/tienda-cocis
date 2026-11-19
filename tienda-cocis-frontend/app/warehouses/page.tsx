"use client";

import CatalogPage from "../../components/catalogPage";
import { Icon } from "../../components/icons";
import { almacenService } from "../../services/catalogService";
import type { Almacen } from "../../types";

export default function WarehousesPage() {
  return (
    <CatalogPage<Almacen>
      titulo="Almacenes"
      subtitulo="Ubicaciones físicas donde se guardan las existencias"
      sustantivo={["almacén", "almacenes"]}
      icono="almacen"
      servicio={almacenService}
      clave="idAlmacen"
      vacio={{ idAlmacen: "", nombre: "", direccion: "" }}
      campos={[
        { nombre: "nombre", etiqueta: "Almacén", placeholder: "Ej. Almacén Lima Norte" },
        {
          nombre: "direccion",
          etiqueta: "Dirección",
          placeholder: "Ej. Av. Túpac Amaru 2150, Comas",
          formato: (a) => (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="ubicacion" size={14} />
              {a.direccion}
            </span>
          ),
        },
      ]}
    />
  );
}
