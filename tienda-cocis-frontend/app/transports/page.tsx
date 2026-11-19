"use client";

import CatalogPage from "../../components/catalogPage";
import { Icon, type NombreIcono } from "../../components/icons";
import { transporteService } from "../../services/catalogService";
import type { TipoTransporte, Transporte } from "../../types";

const TIPOS: Record<TipoTransporte, { etiqueta: string; plural: string; icono: NombreIcono }> = {
  camion: { etiqueta: "Camión", plural: "Camiones", icono: "camion" },
  furgoneta: { etiqueta: "Furgoneta", plural: "Furgonetas", icono: "furgoneta" },
  moto: { etiqueta: "Moto", plural: "Motos", icono: "moto" },
};

export default function TransportsPage() {
  return (
    <CatalogPage<Transporte>
      titulo="Transportes"
      subtitulo="Vehículos que se asignan a las entregas"
      sustantivo={["vehículo", "vehículos"]}
      icono="camion"
      servicio={transporteService}
      clave="idTransporte"
      vacio={{ idTransporte: "", placa: "", conductor: "", tipo: "furgoneta" }}
      resumen={(lista) => (
        <div className="kpi-grid">
          {(Object.keys(TIPOS) as TipoTransporte[]).map((t) => (
            <div key={t} className="kpi" style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: "16px 20px" }}>
              <span className="kpi-chip" style={{ width: 40, height: 40 }}>
                <Icon name={TIPOS[t].icono} size={20} />
              </span>
              <div>
                <p className="kpi-label">{TIPOS[t].plural}</p>
                <p className="num" style={{ fontSize: 20, lineHeight: "28px", fontWeight: 600 }}>
                  {lista.filter((v) => v.tipo === t).length}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      campos={[
        { nombre: "placa", etiqueta: "Placa", placeholder: "Ej. ABC-123", formato: (v) => <span className="placa mono">{v.placa}</span> },
        { nombre: "conductor", etiqueta: "Conductor", placeholder: "Ej. Luis Ramírez", formato: (v) => <span style={{ color: "var(--texto)", fontWeight: 500 }}>{v.conductor}</span> },
        {
          nombre: "tipo",
          etiqueta: "Tipo",
          tipo: "select",
          ancho: 200,
          opciones: (Object.keys(TIPOS) as TipoTransporte[]).map((t) => ({ valor: t, etiqueta: TIPOS[t].etiqueta })),
          formato: (v) => (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name={TIPOS[v.tipo]?.icono || "camion"} size={16} />
              {TIPOS[v.tipo]?.etiqueta || v.tipo}
            </span>
          ),
        },
      ]}
    />
  );
}
