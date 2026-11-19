import { peticionApi } from "./api";
import type { Almacen, Proveedor, Transporte, Usuario } from "../types";

export interface ServicioCatalogo<T> {
  listar: () => Promise<T[]>;
  crear: (datos: T) => Promise<T>;
  actualizar: (id: string, datos: T) => Promise<T>;
  eliminar: (id: string) => Promise<unknown>;
}

/** Crea las cuatro operaciones CRUD de un catálogo expuesto en /api/{ruta}. */
function crearServicioCatalogo<T>(ruta: string): ServicioCatalogo<T> {
  return {
    listar: async () => (await peticionApi<T[] | null>(ruta)) || [],
    crear: (datos) => peticionApi<T>(ruta, { method: "POST", body: JSON.stringify(datos) }),
    actualizar: (id, datos) =>
      peticionApi<T>(`${ruta}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(datos) }),
    eliminar: (id) => peticionApi<unknown>(`${ruta}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const usuarioService = crearServicioCatalogo<Usuario>("/users");
export const proveedorService = crearServicioCatalogo<Proveedor>("/suppliers");
export const almacenService = crearServicioCatalogo<Almacen>("/warehouses");
export const transporteService = crearServicioCatalogo<Transporte>("/transports");
