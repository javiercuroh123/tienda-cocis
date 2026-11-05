import { peticionApi } from "./api";

export function obtenerInventario(estrategia = "estandar") {
  return peticionApi(`/inventory?estrategia=${encodeURIComponent(estrategia)}`);
}

export function obtenerInventarioPorId(idInventorio, estrategia = "estandar") {
  return peticionApi(
    `/inventory/${encodeURIComponent(idInventorio)}?estrategia=${encodeURIComponent(estrategia)}`
  );
}

export function crearInventario(datos) {
  return peticionApi("/inventory", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function actualizarStock(idInventorio, datos) {
  return peticionApi(`/inventory/${encodeURIComponent(idInventorio)}`, {
    method: "PUT",
    body: JSON.stringify(datos),
  });
}

export function eliminarInventario(idInventorio) {
  return peticionApi(`/inventory/${encodeURIComponent(idInventorio)}`, {
    method: "DELETE",
  });
}
