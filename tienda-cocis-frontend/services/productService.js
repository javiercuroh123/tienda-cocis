import { peticionApi } from "./api";

export function obtenerProductos() {
  return peticionApi("/products");
}

export function obtenerProductoPorId(idProducto) {
  return peticionApi(`/products/${encodeURIComponent(idProducto)}`);
}

export function crearProducto(producto) {
  return peticionApi("/products", {
    method: "POST",
    body: JSON.stringify(producto),
  });
}

export function actualizarProducto(idProducto, producto) {
  return peticionApi(`/products/${encodeURIComponent(idProducto)}`, {
    method: "PUT",
    body: JSON.stringify(producto),
  });
}

export function eliminarProducto(idProducto) {
  return peticionApi(`/products/${encodeURIComponent(idProducto)}`, {
    method: "DELETE",
  });
}
