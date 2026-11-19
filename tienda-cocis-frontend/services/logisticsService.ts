import { peticionApi } from "./api";
import type {
  DetalleEntrega,
  Entrega,
  EntregaEntrada,
  EstadoEntrega,
  Movimiento,
  MovimientoEntrada,
} from "../types";

export async function obtenerMovimientos(filtro: { idProducto?: string; idAlmacen?: string } = {}) {
  const parametros = new URLSearchParams();
  if (filtro.idProducto) parametros.set("idProducto", filtro.idProducto);
  if (filtro.idAlmacen) parametros.set("idAlmacen", filtro.idAlmacen);
  const consulta = parametros.toString();
  return (await peticionApi<Movimiento[] | null>(`/movements${consulta ? `?${consulta}` : ""}`)) || [];
}

export function registrarMovimiento(datos: MovimientoEntrada) {
  return peticionApi<Movimiento[]>("/movements", { method: "POST", body: JSON.stringify(datos) });
}

export async function obtenerEntregas() {
  return (await peticionApi<Entrega[] | null>("/deliveries")) || [];
}

export function crearEntrega(datos: EntregaEntrada) {
  return peticionApi<Entrega>("/deliveries", { method: "POST", body: JSON.stringify(datos) });
}

export function actualizarDetallesEntrega(idEntrega: string, detalles: DetalleEntrega[]) {
  return peticionApi<Entrega>(`/deliveries/${encodeURIComponent(idEntrega)}/items`, {
    method: "PUT",
    body: JSON.stringify({ detalles }),
  });
}

export function cambiarEstadoEntrega(idEntrega: string, estado: EstadoEntrega, idTransporte = "") {
  return peticionApi<Entrega>(`/deliveries/${encodeURIComponent(idEntrega)}/estado`, {
    method: "POST",
    body: JSON.stringify({ estado, idTransporte }),
  });
}
