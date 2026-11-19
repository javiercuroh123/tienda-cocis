"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { actualizarStockMinimo, eliminarInventario, obtenerInventario } from "../services/inventoryService";
import { almacenService } from "../services/catalogService";
import { mensajeDeError } from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Segmented,
  Select,
  SkeletonRows,
  StockBar,
  usePaginacion,
  useToast,
} from "./ui";
import { Icon } from "./icons";
import { useResumen } from "./shell";
import { descargarCSV, diaCorto, estadoStock, fechaHora, hora, soles } from "../lib/format";
import type { Almacen, Estrategia, Inventario } from "../types";

const ESTRATEGIAS: { value: Estrategia; label: string }[] = [
  { value: "estandar", label: "Estándar" },
  { value: "liquidacion", label: "Liquidación −30 %" },
  { value: "volumen", label: "Volumen ≥ 20 uds" },
];

const ETIQUETA_ESTADO = { optimo: ["Óptimo", "success"], bajo: ["Bajo stock", "danger"], "sin-stock": ["Sin stock", "danger"] } as const;

/** Existencias por almacén con valorización por estrategia y modal para el stock mínimo. */
export default function InventoryView({ editarId }: { editarId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { recargar } = useResumen();
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [idAlmacen, setIdAlmacen] = useState("");
  const [estrategia, setEstrategia] = useState<Estrategia>("estandar");
  const [soloBajo, setSoloBajo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState<Inventario | null>(null);
  const [stockMin, setStockMin] = useState("");
  const [errorModal, setErrorModal] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Inventario | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("filtro") === "bajo") setSoloBajo(true);
    almacenService.listar().then(setAlmacenes).catch(() => setAlmacenes([]));
  }, []);

  const cargar = async () => {
    try {
      setError("");
      const lista = (await obtenerInventario(estrategia, idAlmacen)) || [];
      setInventario(lista);
      return lista;
    } catch (err) {
      setError(mensajeDeError(err));
      return [];
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setCargando(true);
    cargar().then((lista) => {
      if (editarId && !editando) {
        const r = lista.find((i) => i.idInventorio === editarId);
        if (r) abrir(r);
      }
    });
  }, [estrategia, idAlmacen]);

  const visibles = useMemo(() => (soloBajo ? inventario.filter((i) => i.stock <= i.stockMin) : inventario), [inventario, soloBajo]);
  const pag = usePaginacion(visibles, 12);
  const valorTotal = visibles.reduce((a, i) => a + (Number(i.valorCalculado) || 0), 0);
  const nBajo = inventario.filter((i) => i.stock <= i.stockMin).length;

  function abrir(i: Inventario) {
    setErrorModal("");
    setStockMin(String(i.stockMin));
    setEditando(i);
  }

  const cerrar = () => {
    setEditando(null);
    if (editarId) router.replace("/inventory");
  };

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editando) return;
    try {
      setEnviando(true);
      setErrorModal("");
      await actualizarStockMinimo(editando.idInventorio, { stockMin: parseInt(stockMin, 10), estrategia });
      toast({ titulo: "Stock mínimo actualizado", descripcion: `${editando.nombreProducto} · mínimo ${stockMin}` });
      cerrar();
      await cargar();
      recargar();
    } catch (err) {
      setErrorModal(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (i: Inventario) => {
    try {
      setError("");
      await eliminarInventario(i.idInventorio);
      toast({ titulo: "Registro eliminado", descripcion: `${i.nombreProducto} · ${i.nombreAlmacen}` });
      await cargar();
      recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const exportar = () =>
    descargarCSV(
      `inventario-${estrategia}.csv`,
      ["ID", "Producto", "Almacén", "Stock", "Stock mínimo", "Precio base (S/)", "Valor calculado (S/)", "Última actualización"],
      visibles.map((i) => [i.idInventorio, i.nombreProducto || "", i.nombreAlmacen || "", i.stock, i.stockMin, Number(i.precioUnidad).toFixed(2), Number(i.valorCalculado).toFixed(2), fechaHora(i.ultimaActualizacion)])
    );

  const nuevoMin = parseInt(stockMin, 10);

  return (
    <>
      <PageHeader
        title="Inventario"
        subtitle="Existencias por almacén. La cantidad cambia solo con movimientos."
        actions={
          <>
            <Button variant="secondary" icon="descargar" onClick={exportar} disabled={visibles.length === 0}>
              Exportar
            </Button>
            <Link href="/movements">
              <Button icon="movimientos">Registrar movimiento</Button>
            </Link>
          </>
        }
      />

      {error && <Alert tone="danger" title="No se pudo completar la operación">{error}</Alert>}

      <Card flush>
        <div className="toolbar">
          <div style={{ width: 220, maxWidth: "100%" }}>
            <Select aria-label="Filtrar por almacén" value={idAlmacen} onChange={(e) => setIdAlmacen(e.target.value)}>
              <option value="">Todos los almacenes</option>
              {almacenes.map((a) => (
                <option key={a.idAlmacen} value={a.idAlmacen}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </div>
          <Segmented label="Estrategia de valorización" options={ESTRATEGIAS} value={estrategia} onChange={setEstrategia} />
          <Segmented
            label="Filtro de stock"
            options={[
              { value: "todos", label: "Todos" },
              { value: "bajo", label: `Stock bajo${nBajo ? ` (${nBajo})` : ""}` },
            ]}
            value={soloBajo ? "bajo" : "todos"}
            onChange={(v) => setSoloBajo(v === "bajo")}
          />
          <span className="toolbar-spacer" />
          <span className="toolbar-meta">
            Valor total <strong className="num" style={{ color: "var(--texto)", fontSize: 16, fontWeight: 600, marginLeft: 6 }}>{soles(valorTotal)}</strong>
          </span>
        </div>

        {cargando ? (
          <SkeletonRows rows={6} cols={6} />
        ) : visibles.length === 0 ? (
          soloBajo ? (
            <EmptyState ok title="Todo en orden" description="Ningún producto está en o por debajo de su stock mínimo." />
          ) : (
            <EmptyState icon="inventario" title="Sin existencias" description="Registra una entrada en Movimientos para crear el primer registro de inventario." />
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="table table-compacta">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Almacén</th>
                    <th>Stock</th>
                    <th className="derecha">Mínimo</th>
                    <th className="derecha">Precio base</th>
                    <th className="derecha">Valor calculado</th>
                    <th>Estado</th>
                    <th className="derecha">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((i) => {
                    const [etiqueta, tono] = ETIQUETA_ESTADO[estadoStock(i.stock, i.stockMin)];
                    return (
                      <tr key={i.idInventorio}>
                        <td className="cell-producto">
                          <p className="cell-main">{i.nombreProducto}</p>
                          <p className="cell-sub">
                            {i.idInventorio} · act. {diaCorto(i.ultimaActualizacion)}, {hora(i.ultimaActualizacion)}
                          </p>
                        </td>
                        <td className="cell-muted nowrap">{i.nombreAlmacen}</td>
                        <td>
                          <StockBar stock={i.stock} stockMin={i.stockMin} />
                        </td>
                        <td className="derecha num">{i.stockMin}</td>
                        <td className="derecha num">{soles(i.precioUnidad)}</td>
                        <td className="derecha num" style={{ fontWeight: 500 }}>
                          {soles(i.valorCalculado)}
                        </td>
                        <td>
                          <Badge tone={tono} dot>
                            {etiqueta}
                          </Badge>
                        </td>
                        <td className="derecha">
                          <div className="row-actions">
                            <IconButton icon="editar" label={`Editar stock mínimo de ${i.nombreProducto}`} onClick={() => abrir(i)} />
                            <IconButton icon="eliminar" tone="danger" label={`Eliminar registro ${i.idInventorio}`} onClick={() => setAEliminar(i)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pag} sustantivo={`registros${nBajo ? ` · ${nBajo} con stock bajo` : ""}`} />
          </>
        )}
      </Card>

      <Modal
        abierto={Boolean(editando)}
        titulo="Editar registro de inventario"
        subtitulo="Ajusta el stock mínimo de alerta."
        onCerrar={cerrar}
        onSubmit={guardar}
        footer={
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar cambios"}
            </Button>
          </>
        }
      >
        {editando && (
          <>
            {errorModal && <Alert tone="danger" title="No se pudo guardar">{errorModal}</Alert>}
            <div className="resumen-producto">
              <span className="icon-tile">
                <Icon name="paquete" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="cell-main">{editando.nombreProducto}</p>
                <p className="cell-sub">
                  {editando.idInventorio} · {editando.nombreAlmacen}
                </p>
              </div>
              {editando.stock <= editando.stockMin ? <Badge tone="danger" dot>Bajo stock</Badge> : <Badge tone="success" dot>Óptimo</Badge>}
            </div>
            <div className="form-grid">
              <div className="field">
                <span className="field-label">Cantidad actual</span>
                <input className="input" value={`${editando.stock} uds`} readOnly aria-label="Cantidad actual" />
                <Link href={`/movements?producto=${editando.idProducto}&almacen=${editando.idAlmacen}`} className="link">
                  Cambiar en Movimientos <Icon name="flecha-derecha" size={12} />
                </Link>
              </div>
              <Input
                id="stockMin"
                label="Stock mínimo de alerta"
                type="number"
                min="0"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
                help="Alerta cuando el stock sea ≤ a este valor."
                required
                autoFocus
              />
            </div>
            <Alert tone="info">
              Valor calculado con la estrategia {ESTRATEGIAS.find((s) => s.value === estrategia)?.label.toLowerCase()}: {soles(editando.valorCalculado)}
              {Number.isFinite(nuevoMin) && nuevoMin !== editando.stockMin && (
                <>
                  {" "}
                  · con mínimo {nuevoMin}, el estado será <strong>{editando.stock <= nuevoMin ? "bajo stock" : "óptimo"}</strong>.
                </>
              )}
            </Alert>
          </>
        )}
      </Modal>

      <ConfirmModal
        abierto={Boolean(aEliminar)}
        titulo="¿Eliminar este registro?"
        mensaje={aEliminar ? `Se eliminará "${aEliminar.nombreProducto}" en ${aEliminar.nombreAlmacen}. Solo se permite si la cantidad es 0.` : ""}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={async () => {
          if (!aEliminar) return;
          const i = aEliminar;
          setAEliminar(null);
          await eliminar(i);
        }}
      />
    </>
  );
}
