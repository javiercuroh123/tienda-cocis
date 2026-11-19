import { peticionApi } from "./api";
import type { Estrategia, Inventario, InventarioEntrada } from "../types";

export function obtenerInventario(estrategia: Estrategia = "estandar", idAlmacen = "") {
  const parametros = new URLSearchParams({ estrategia });
  if (idAlmacen) parametros.set("idAlmacen", idAlmacen);
  return peticionApi<Inventario[] | null>(`/inventory?${parametros}`);
}

export function obtenerInventarioPorId(idInventorio: string, estrategia: Estrategia = "estandar") {
  return peticionApi<Inventario>(
    `/inventory/${encodeURIComponent(idInventorio)}?estrategia=${encodeURIComponent(estrategia)}`
  );
}

/** Solo actualiza el stock mínimo; las cantidades cambian en Movimientos. */
export function actualizarStockMinimo(idInventorio: string, datos: InventarioEntrada) {
  return peticionApi<Inventario>(`/inventory/${encodeURIComponent(idInventorio)}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarInventario(idInventorio: string) {
  return peticionApi<unknown>(`/inventory/${encodeURIComponent(idInventorio)}`, {
    method: "DELETE",
  });
}
