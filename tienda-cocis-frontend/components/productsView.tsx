"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { actualizarProducto, crearProducto, eliminarProducto, obtenerProductos } from "../services/productService";
import { mensajeDeError } from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmModal,
  Drawer,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Pagination,
  Select,
  SkeletonRows,
  usePaginacion,
  useToast,
} from "./ui";
import { useResumen } from "./shell";
import { descargarCSV, soles } from "../lib/format";
import type { Producto } from "../types";

interface Formulario {
  nombreProducto: string;
  precioUnidad: string;
  categoria: string;
}

const VACIO: Formulario = { nombreProducto: "", precioUnidad: "", categoria: "" };

/** Catálogo de productos con búsqueda, filtro por categoría y panel lateral para crear o editar. */
export default function ProductsView({ crearAlIniciar = false }: { crearAlIniciar?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { recargar } = useResumen();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [panel, setPanel] = useState<null | "nuevo" | Producto>(crearAlIniciar ? "nuevo" : null);
  const [formulario, setFormulario] = useState<Formulario>(VACIO);
  const [errorPanel, setErrorPanel] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Producto | null>(null);

  const cargar = async () => {
    try {
      setError("");
      setProductos((await obtenerProductos()) || []);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) => (!categoria || p.categoria === categoria) && (!q || p.nombreProducto.toLowerCase().includes(q) || p.idProducto.toLowerCase().includes(q))
    );
  }, [productos, busqueda, categoria]);
  const pag = usePaginacion(filtrados, 10);

  const abrir = (p: "nuevo" | Producto) => {
    setErrorPanel("");
    setFormulario(p === "nuevo" ? VACIO : { nombreProducto: p.nombreProducto, precioUnidad: String(p.precioUnidad), categoria: p.categoria });
    setPanel(p);
  };

  const cerrar = () => {
    setPanel(null);
    if (crearAlIniciar) router.replace("/products");
  };

  useEffect(() => {
    if (crearAlIniciar) abrir("nuevo");
  }, [crearAlIniciar]);

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = { nombreProducto: formulario.nombreProducto.trim(), precioUnidad: parseFloat(formulario.precioUnidad), categoria: formulario.categoria.trim() };
    try {
      setEnviando(true);
      setErrorPanel("");
      if (panel === "nuevo") {
        await crearProducto(datos);
        toast({ titulo: "Producto creado", descripcion: datos.nombreProducto });
      } else if (panel) {
        await actualizarProducto(panel.idProducto, datos);
        toast({ titulo: "Cambios guardados", descripcion: datos.nombreProducto });
      }
      cerrar();
      await cargar();
      recargar();
    } catch (err) {
      setErrorPanel(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (p: Producto) => {
    try {
      setError("");
      await eliminarProducto(p.idProducto);
      toast({ titulo: "Producto eliminado", descripcion: p.nombreProducto });
      await cargar();
      recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const exportar = () =>
    descargarCSV(
      "productos.csv",
      ["ID", "Producto", "Categoría", "Precio unitario (S/)"],
      filtrados.map((p) => [p.idProducto, p.nombreProducto, p.categoria, Number(p.precioUnidad).toFixed(2)])
    );

  const editando = panel && panel !== "nuevo" ? panel : null;

  return (
    <>
      <PageHeader
        title="Productos"
        subtitle="Catálogo de insumos de embalaje y encomienda · precios en soles"
        actions={
          <>
            <Button variant="secondary" icon="descargar" onClick={exportar} disabled={filtrados.length === 0}>
              Exportar
            </Button>
            <Button icon="mas" onClick={() => abrir("nuevo")}>
              Nuevo producto
            </Button>
          </>
        }
      />

      {error && <Alert tone="danger" title="No se pudo completar la operación">{error}</Alert>}

      <Card flush>
        <div className="toolbar">
          <div style={{ width: 320, maxWidth: "100%" }}>
            <Input icon="buscar" placeholder="Buscar por nombre o ID…" aria-label="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div style={{ width: 220, maxWidth: "100%" }}>
            <Select aria-label="Filtrar por categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <span className="toolbar-spacer" />
          <span className="toolbar-meta">
            {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        {cargando ? (
          <SkeletonRows rows={5} cols={4} />
        ) : filtrados.length === 0 ? (
          productos.length === 0 ? (
            <EmptyState title="Aún no hay productos" description="Crea el primer producto del catálogo." action={<Button icon="mas" onClick={() => abrir("nuevo")}>Nuevo producto</Button>} />
          ) : (
            <EmptyState icon="buscar" title="Sin resultados" description="Ningún producto coincide con la búsqueda o la categoría." />
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th className="derecha">Precio unitario</th>
                    <th className="derecha">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((p) => (
                    <tr key={p.idProducto}>
                      <td>
                        <p className="cell-main">{p.nombreProducto}</p>
                        <p className="cell-sub mono">{p.idProducto}</p>
                      </td>
                      <td>
                        <Badge>{p.categoria}</Badge>
                      </td>
                      <td className="derecha num" style={{ fontWeight: 500 }}>
                        {soles(p.precioUnidad)}
                      </td>
                      <td className="derecha">
                        <div className="row-actions">
                          <IconButton icon="editar" label={`Editar ${p.nombreProducto}`} onClick={() => abrir(p)} />
                          <IconButton icon="eliminar" tone="danger" label={`Eliminar ${p.nombreProducto}`} onClick={() => setAEliminar(p)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pag} sustantivo="productos" />
          </>
        )}
      </Card>

      <Drawer
        abierto={panel !== null}
        titulo={editando ? "Editar producto" : "Nuevo producto"}
        subtitulo={editando ? editando.idProducto : "Se agregará al catálogo con un ID automático."}
        onCerrar={cerrar}
        onSubmit={guardar}
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar producto"}
            </Button>
          </>
        }
      >
        {errorPanel && <Alert tone="danger" title="Revisa los datos">{errorPanel}</Alert>}
        <Input
          id="nombreProducto"
          label="Nombre del producto"
          placeholder="Ej. Caja de Cartón Shalom Mediana (30x20x20)"
          value={formulario.nombreProducto}
          onChange={(e) => setFormulario({ ...formulario, nombreProducto: e.target.value })}
          required
          autoFocus
        />
        <Input
          id="categoria"
          label="Categoría"
          placeholder="Ej. Embalaje y Cajas"
          list="categorias-existentes"
          value={formulario.categoria}
          onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
          help="Elige una existente o escribe una nueva."
          required
        />
        <datalist id="categorias-existentes">
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Input
          id="precioUnidad"
          label="Precio unitario (S/)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={formulario.precioUnidad}
          onChange={(e) => setFormulario({ ...formulario, precioUnidad: e.target.value })}
          help="Precio de venta por unidad, en soles."
          required
        />
        {!editando && (
          <Alert tone="info" title="El stock se registra aparte">
            Después de guardar, registra una entrada en Movimientos para asignarle existencias.
          </Alert>
        )}
      </Drawer>

      <ConfirmModal
        abierto={Boolean(aEliminar)}
        titulo="¿Eliminar este producto?"
        mensaje={aEliminar ? `Se eliminará "${aEliminar.nombreProducto}". Esta acción no se puede deshacer.` : ""}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={async () => {
          if (!aEliminar) return;
          const p = aEliminar;
          setAEliminar(null);
          await eliminar(p);
        }}
      />
    </>
  );
}
