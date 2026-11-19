import { peticionApi } from "./api";
import type { Producto, ProductoEntrada } from "../types";

export function obtenerProductos() {
  return peticionApi<Producto[] | null>("/products");
}

export function obtenerProductoPorId(idProducto: string) {
  return peticionApi<Producto>(`/products/${encodeURIComponent(idProducto)}`);
}

export function crearProducto(producto: ProductoEntrada) {
  return peticionApi<Producto>("/products", {
    method: "POST",
    body: JSON.stringify(producto),
  });
}

export function actualizarProducto(idProducto: string, producto: ProductoEntrada) {
  return peticionApi<Producto>(`/products/${encodeURIComponent(idProducto)}`, {
    method: "PUT",
    body: JSON.stringify(producto),
  });
}

export function eliminarProducto(idProducto: string) {
  return peticionApi<unknown>(`/products/${encodeURIComponent(idProducto)}`, {
    method: "DELETE",
  });
}
