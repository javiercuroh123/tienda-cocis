"use client";

import { useEffect, useState } from "react";
import CatalogPage from "../../components/catalogPage";
import { Badge } from "../../components/ui";
import { Icon } from "../../components/icons";
import { proveedorService } from "../../services/catalogService";
import { obtenerProductos } from "../../services/productService";
import type { Producto, Proveedor } from "../../types";

export default function SuppliersPage() {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    obtenerProductos()
      .then((lista) => setProductos(lista || []))
      .catch(() => setProductos([]));
  }, []);

  const nombre = (idProducto: string) => productos.find((p) => p.idProducto === idProducto)?.nombreProducto || idProducto;

  return (
    <CatalogPage<Proveedor>
      titulo="Proveedores"
      subtitulo="Empresas que abastecen los productos del catálogo"
      sustantivo={["proveedor", "proveedores"]}
      icono="proveedor"
      avatar
      servicio={proveedorService}
      clave="idProveedor"
      vacio={{ idProveedor: "", nombre: "", telefono: "", productos: [] }}
      campos={[
        { nombre: "nombre", etiqueta: "Proveedor", placeholder: "Ej. Cartones del Perú S.A.C." },
        {
          nombre: "telefono",
          etiqueta: "Teléfono",
          tipo: "tel",
          placeholder: "Ej. 01 456 7890",
          ancho: 160,
          formato: (p) => (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <Icon name="telefono" size={14} />
              {p.telefono}
            </span>
          ),
        },
      ]}
      columnaExtra={{
        titulo: "Productos que abastece",
        ancho: 420,
        celda: (p) =>
          p.productos.length === 0 ? (
            <span style={{ color: "var(--texto-3)" }}>—</span>
          ) : (
            <div className="chips">
              {p.productos.map((id) => (
                <Badge key={id}>{nombre(id)}</Badge>
              ))}
            </div>
          ),
      }}
      extraFormulario={(valor, cambiar) => (
        <fieldset className="field">
          <legend className="field-label" style={{ marginBottom: 6 }}>
            Productos que abastece
          </legend>
          {productos.length === 0 ? (
            <p className="field-help">No hay productos en el catálogo.</p>
          ) : (
            <div className="check-list">
              {productos.map((p) => (
                <label key={p.idProducto} className="check-item">
                  <input
                    type="checkbox"
                    checked={valor.productos.includes(p.idProducto)}
                    onChange={(e) =>
                      cambiar({
                        ...valor,
                        productos: e.target.checked ? [...valor.productos, p.idProducto] : valor.productos.filter((id) => id !== p.idProducto),
                      })
                    }
                  />
                  <span style={{ flex: 1 }}>{p.nombreProducto}</span>
                  <span className="mono" style={{ color: "var(--texto-3)" }}>
                    {p.idProducto}
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="field-help">{valor.productos.length} seleccionados</p>
        </fieldset>
      )}
    />
  );
}
