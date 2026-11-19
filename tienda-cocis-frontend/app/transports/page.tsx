"use client";

import CatalogPage from "../../components/catalogPage";
import { transporteService } from "../../services/catalogService";
import type { Transporte } from "../../types";

export default function TransportsPage() {
  return (
    <CatalogPage<Transporte>
      titulo="Transportes"
      subtitulo="Vehículos que se asignan a las entregas"
      servicio={transporteService}
      clave="idTransporte"
      vacio={{ idTransporte: "", placa: "", conductor: "", tipo: "furgoneta" }}
      campos={[
        { nombre: "placa", etiqueta: "Placa" },
        { nombre: "conductor", etiqueta: "Conductor" },
        {
          nombre: "tipo",
          etiqueta: "Tipo",
          tipo: "select",
          opciones: [
            { valor: "camion", etiqueta: "Camión" },
            { valor: "furgoneta", etiqueta: "Furgoneta" },
            { valor: "moto", etiqueta: "Moto" },
          ],
        },
      ]}
    />
  );
}
