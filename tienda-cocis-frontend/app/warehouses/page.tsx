"use client";

import CatalogPage from "../../components/catalogPage";
import { almacenService } from "../../services/catalogService";

export default function WarehousesPage() {
  return (
    <CatalogPage
      titulo="Almacenes"
      subtitulo="Ubicaciones físicas donde se guardan las existencias"
      servicio={almacenService}
      clave="idAlmacen"
      vacio={{ idAlmacen: "", nombre: "", direccion: "" }}
      campos={[
        { nombre: "nombre", etiqueta: "Nombre" },
        { nombre: "direccion", etiqueta: "Dirección" },
      ]}
    />
  );
}
