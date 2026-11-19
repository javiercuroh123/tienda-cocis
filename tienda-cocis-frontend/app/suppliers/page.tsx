"use client";

import { useEffect, useState } from "react";
import CatalogPage from "../../components/catalogPage";
import { proveedorService } from "../../services/catalogService";
import { obtenerProductos } from "../../services/productService";
import type { Producto } from "../../types";

export default function SuppliersPage() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    obtenerProductos()
      .then((lista) => setProductos(lista || []))
      .catch(() => setProductos([]));
  }, []);

  const nombre = (idProducto: string) =>
    productos.find((p) => p.idProducto === idProducto)?.nombreProducto || idProducto;

  return (
    <CatalogPage
      titulo="Proveedores"
      subtitulo="Proveedores y los productos que abastecen (producto_proveedor)"
      servicio={proveedorService}
      clave="idProveedor"
      vacio={{ idProveedor: "", nombre: "", telefono: "", productos: [] }}
      campos={[
        { nombre: "nombre", etiqueta: "Nombre" },
        { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel" },
      ]}
      extraFormulario={(valor, cambiar) => (
        <fieldset className="field">
          <legend className="mb-1 text-sm font-medium">Productos que abastece</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {productos.map((p) => (
              <label key={p.idProducto} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={valor.productos.includes(p.idProducto)}
                  onChange={(e) =>
                    cambiar({
                      ...valor,
                      productos: e.target.checked
                        ? [...valor.productos, p.idProducto]
                        : valor.productos.filter((id) => id !== p.idProducto),
                    })
                  }
                />
                {p.nombreProducto}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      columnaExtra={{
        titulo: "Productos",
        celda: (valor) =>
          valor.productos.length === 0 ? (
            <span className="text-zinc-400">—</span>
          ) : (
            <ul className="list-disc pl-4 text-sm">
              {valor.productos.map((id) => (
                <li key={id}>{nombre(id)}</li>
              ))}
            </ul>
          ),
      }}
    />
  );
}
