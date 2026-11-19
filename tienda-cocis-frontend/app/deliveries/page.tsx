"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  Modal,
  PageHeader,
  Pagination,
  Select,
  SkeletonRows,
  usePaginacion,
  useToast,
  type TonoBadge,
} from "../../components/ui";
import { Icon } from "../../components/icons";
import { useResumen } from "../../components/shell";
import { mensajeDeError } from "../../services/api";
import { transporteService } from "../../services/catalogService";
import { actualizarDetallesEntrega, cambiarEstadoEntrega, crearEntrega, obtenerEntregas } from "../../services/logisticsService";
import { obtenerProductos } from "../../services/productService";
import { descargarCSV, fechaSimple } from "../../lib/format";
import type { DetalleEntrega, Entrega, EstadoEntrega, Producto, Transporte } from "../../types";

const ESTADOS: EstadoEntrega[] = ["pendiente", "asignada", "en_transito", "entregada", "cancelada"];

const etiquetas: Record<EstadoEntrega, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_transito: "En tránsito",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

const tonos: Record<EstadoEntrega, TonoBadge> = {
  pendiente: "neutral",
  asignada: "info",
  en_transito: "warning",
  entregada: "success",
  cancelada: "danger",
};

// Fecha local AAAA-MM-DD (toISOString usaría UTC y daría el día siguiente por la noche en Perú).
const hoy = () => new Date().toLocaleDateString("en-CA");
const nuevaLinea = (): DetalleEntrega => ({ idProducto: "", cantidad: 1 });

export default function DeliveriesPage() {
  const toast = useToast();
  const { recargar } = useResumen();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [pestana, setPestana] = useState<EstadoEntrega | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [panel, setPanel] = useState<null | "nueva" | Entrega>(null);
  const [destinatario, setDestinatario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [lineas, setLineas] = useState<DetalleEntrega[]>([nuevaLinea()]);
  const [asignando, setAsignando] = useState<Entrega | null>(null);
  const [vehiculo, setVehiculo] = useState("");
  const [aCancelar, setACancelar] = useState<Entrega | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [errorPanel, setErrorPanel] = useState("");

  const cargar = async () => {
    try {
      setEntregas(await obtenerEntregas());
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const estado = new URLSearchParams(window.location.search).get("estado") as EstadoEntrega | null;
    if (estado && ESTADOS.includes(estado)) setPestana(estado);
    cargar();
    Promise.all([obtenerProductos(), transporteService.listar()])
      .then(([prods, trps]) => {
        setProductos(prods || []);
        setTransportes(trps);
      })
      .catch((err) => setError(mensajeDeError(err)));
  }, []);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return entregas.filter(
      (e) =>
        (pestana === "todas" || e.estado === pestana) &&
        (!q || e.destinatario.toLowerCase().includes(q) || e.direccion.toLowerCase().includes(q) || e.idEntrega.toLowerCase().includes(q))
    );
  }, [entregas, pestana, busqueda]);
  const pag = usePaginacion(filtradas, 10);

  /** Ejecuta una operación, muestra el aviso y vuelve a consultar la lista. */
  const ejecutar = async (operacion: () => Promise<unknown>, titulo: string, descripcion?: string) => {
    try {
      setError("");
      await operacion();
      toast({ titulo, descripcion });
      await cargar();
      recargar();
      return true;
    } catch (err) {
      setError(mensajeDeError(err));
      return false;
    }
  };

  const abrirNueva = () => {
    setDestinatario("");
    setDireccion("");
    setFecha(hoy());
    setLineas([nuevaLinea()]);
    setErrorPanel("");
    setPanel("nueva");
  };

  const abrirEdicion = (e: Entrega) => {
    setLineas(e.detalles.map((d) => ({ idProducto: d.idProducto, cantidad: d.cantidad })));
    setErrorPanel("");
    setPanel(e);
  };

  const guardar = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setEnviando(true);
    setErrorPanel("");
    const detalles = lineas.map((l) => ({ idProducto: l.idProducto, cantidad: Number(l.cantidad) }));
    try {
      if (panel === "nueva") {
        await crearEntrega({ destinatario, direccion, fecha, detalles });
        toast({ titulo: "Entrega creada", descripcion: `${destinatario} · ${fechaSimple(fecha)}` });
      } else if (panel) {
        await actualizarDetallesEntrega(panel.idEntrega, detalles);
        toast({ titulo: "Productos actualizados", descripcion: panel.idEntrega });
      }
      setPanel(null);
      await cargar();
      recargar();
    } catch (err) {
      setErrorPanel(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const cambiarLinea = (i: number, cambio: Partial<DetalleEntrega>) => setLineas(lineas.map((l, j) => (j === i ? { ...l, ...cambio } : l)));

  const conductor = (e: Entrega) => transportes.find((t) => t.idTransporte === e.idTransporte)?.conductor;

  const exportar = () =>
    descargarCSV(
      "entregas.csv",
      ["ID", "Fecha", "Destinatario", "Dirección", "Productos", "Vehículo", "Estado"],
      filtradas.map((e) => [e.idEntrega, e.fecha, e.destinatario, e.direccion, e.detalles.map((d) => `${d.nombreProducto} x${d.cantidad}`).join(", "), e.placa || "", etiquetas[e.estado]])
    );

  const editando = panel && panel !== "nueva" ? panel : null;

  return (
    <>
      <PageHeader
        title="Entregas"
        subtitle="Despachos a clientes y su estado de ruta"
        actions={
          <>
            <Button variant="secondary" icon="descargar" onClick={exportar} disabled={filtradas.length === 0}>
              Exportar
            </Button>
            <Button icon="mas" onClick={abrirNueva}>
              Nueva entrega
            </Button>
          </>
        }
      />

      {error && <Alert tone="danger" title="No se pudo completar la operación">{error}</Alert>}

      <Card flush>
        <div className="tabs" role="tablist" aria-label="Estado de la entrega">
          {(["todas", ...ESTADOS] as const).map((p) => {
            const n = p === "todas" ? entregas.length : entregas.filter((e) => e.estado === p).length;
            return (
              <button key={p} type="button" role="tab" aria-selected={pestana === p} className={`tab${pestana === p ? " active" : ""}`} onClick={() => setPestana(p)}>
                {p === "todas" ? "Todas" : etiquetas[p]}
                <span className="tab-count">{n}</span>
              </button>
            );
          })}
          <span className="toolbar-spacer" />
          <div style={{ width: 260, flexShrink: 0, padding: "8px 0" }}>
            <Input icon="buscar" placeholder="Buscar destinatario…" aria-label="Buscar entrega" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>

        {cargando ? (
          <SkeletonRows rows={5} cols={5} />
        ) : filtradas.length === 0 ? (
          entregas.length === 0 ? (
            <EmptyState icon="entregas" title="Aún no hay entregas" description="Crea la primera entrega para empezar a despachar." action={<Button icon="mas" onClick={abrirNueva}>Nueva entrega</Button>} />
          ) : (
            <EmptyState icon="buscar" title="Sin entregas en esta vista" description="Prueba con otra pestaña o búsqueda." />
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Entrega</th>
                    <th>Destinatario</th>
                    <th>Productos</th>
                    <th>Vehículo</th>
                    <th>Estado</th>
                    <th className="derecha">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((e) => (
                    <tr key={e.idEntrega}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{e.idEntrega}</p>
                        <p className="cell-sub">{fechaSimple(e.fecha)}</p>
                      </td>
                      <td>
                        <p className="cell-main">{e.destinatario}</p>
                        <p className="cell-sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="ubicacion" size={12} />
                          {e.direccion}
                        </p>
                      </td>
                      <td style={{ maxWidth: 240 }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>
                          {e.detalles.length} {e.detalles.length === 1 ? "producto" : "productos"}
                        </p>
                        <p className="cell-sub clamp-2" title={e.detalles.map((d) => `${d.nombreProducto} ×${d.cantidad}`).join("\n")}>
                          {e.detalles.map((d) => `${d.nombreProducto} ×${d.cantidad}`).join(" · ")}
                        </p>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {e.placa ? (
                          <>
                            <p style={{ fontSize: 13, fontWeight: 500 }}>{e.placa}</p>
                            <p className="cell-sub">{conductor(e)}</p>
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--texto-3)" }}>Sin asignar</span>
                        )}
                      </td>
                      <td>
                        <Badge tone={tonos[e.estado]} dot>
                          {etiquetas[e.estado]}
                        </Badge>
                      </td>
                      <td className="derecha">
                        <div className="row-actions">
                          {e.siguientes.includes("asignada") && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="camion"
                              onClick={() => {
                                setVehiculo(e.idTransporte || "");
                                setAsignando(e);
                              }}
                            >
                              Asignar vehículo
                            </Button>
                          )}
                          {e.siguientes.includes("en_transito") && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="flecha-derecha"
                              onClick={() => ejecutar(() => cambiarEstadoEntrega(e.idEntrega, "en_transito"), "Entrega en ruta", "Recuerda registrar la salida en Movimientos.")}
                            >
                              Iniciar ruta
                            </Button>
                          )}
                          {e.siguientes.includes("entregada") && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="check"
                              onClick={() => ejecutar(() => cambiarEstadoEntrega(e.idEntrega, "entregada"), "Entrega completada", `${e.idEntrega} · ${e.destinatario}`)}
                            >
                              Marcar entregada
                            </Button>
                          )}
                          {(e.estado === "pendiente" || e.estado === "asignada") && <IconButton icon="editar" label={`Editar productos de ${e.idEntrega}`} onClick={() => abrirEdicion(e)} />}
                          {e.siguientes.includes("cancelada") && <IconButton icon="cerrar" tone="danger" label={`Cancelar ${e.idEntrega}`} onClick={() => setACancelar(e)} />}
                          {e.siguientes.length === 0 && <span style={{ fontSize: 13, color: "var(--texto-3)" }}>{e.estado === "entregada" ? "Completada" : "—"}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pag} sustantivo="entregas" />
          </>
        )}
      </Card>

      <Drawer
        abierto={panel !== null}
        titulo={editando ? `Productos de ${editando.idEntrega}` : "Nueva entrega"}
        subtitulo={editando ? `${editando.destinatario} · ${etiquetas[editando.estado]}` : "Se crea en estado Pendiente. El vehículo se asigna después."}
        onCerrar={() => setPanel(null)}
        onSubmit={guardar}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : editando ? "Guardar productos" : "Crear entrega"}
            </Button>
          </>
        }
      >
        {errorPanel && <Alert tone="danger" title="Revisa los datos">{errorPanel}</Alert>}
        {!editando && (
          <>
            <Input id="destinatario" label="Destinatario" placeholder="Ej. Bodega Santa Rosa" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} required autoFocus />
            <Input id="direccion" label="Dirección" placeholder="Ej. Av. Universitaria 3210, Los Olivos" value={direccion} onChange={(e) => setDireccion(e.target.value)} required />
            <div style={{ maxWidth: 220 }}>
              <Input id="fecha" label="Fecha de entrega" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: editando ? 0 : 16, borderTop: editando ? "none" : "1px solid var(--borde)" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <p style={{ flex: 1, fontWeight: 600 }}>Productos a entregar</p>
            <span className="cell-sub">
              {lineas.length} {lineas.length === 1 ? "línea" : "líneas"}
            </span>
          </div>
          {lineas.map((linea, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 88px auto", gap: 8, alignItems: "center" }}>
              <Select id={`producto-${i}`} aria-label={`Producto de la línea ${i + 1}`} value={linea.idProducto} onChange={(e) => cambiarLinea(i, { idProducto: e.target.value })} required>
                <option value="">Seleccione un producto…</option>
                {productos.map((p) => (
                  <option key={p.idProducto} value={p.idProducto}>
                    {p.nombreProducto}
                  </option>
                ))}
              </Select>
              <Input
                id={`cantidad-${i}`}
                aria-label={`Cantidad de la línea ${i + 1}`}
                type="number"
                min="1"
                value={linea.cantidad}
                onChange={(e) => cambiarLinea(i, { cantidad: Number(e.target.value) })}
                required
              />
              <IconButton icon="eliminar" tone="danger" label={`Quitar línea ${i + 1}`} disabled={lineas.length === 1} onClick={() => setLineas(lineas.filter((_, j) => j !== i))} />
            </div>
          ))}
          <div>
            <Button variant="subtle" size="sm" icon="mas" onClick={() => setLineas([...lineas, nuevaLinea()])}>
              Agregar producto
            </Button>
          </div>
        </div>
        <Alert tone="info" title="Flujo de estados">
          Pendiente → Asignada → En tránsito → Entregada. Despachar no descuenta stock: registra la salida en Movimientos.
        </Alert>
      </Drawer>

      <Modal
        abierto={Boolean(asignando)}
        titulo="Asignar vehículo"
        subtitulo={asignando ? `${asignando.idEntrega} · ${asignando.destinatario}` : undefined}
        ancho={440}
        onCerrar={() => setAsignando(null)}
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!asignando) return;
          const e = asignando;
          const t = transportes.find((x) => x.idTransporte === vehiculo);
          setAsignando(null);
          await ejecutar(() => cambiarEstadoEntrega(e.idEntrega, "asignada", vehiculo), "Vehículo asignado", t ? `${t.placa} · ${t.conductor}` : e.idEntrega);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAsignando(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!vehiculo}>
              Asignar
            </Button>
          </>
        }
      >
        {transportes.length === 0 ? (
          <Alert tone="warning" title="No hay vehículos registrados">
            Agrega uno en Transportes para poder asignarlo.
          </Alert>
        ) : (
          <Select id="vehiculo" label="Vehículo" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} required autoFocus>
            <option value="">Seleccione un vehículo…</option>
            {transportes.map((t) => (
              <option key={t.idTransporte} value={t.idTransporte}>
                {t.placa} · {t.conductor}
              </option>
            ))}
          </Select>
        )}
      </Modal>

      <ConfirmModal
        abierto={Boolean(aCancelar)}
        titulo="¿Cancelar esta entrega?"
        mensaje={aCancelar ? `La entrega ${aCancelar.idEntrega} para ${aCancelar.destinatario} pasará a Cancelada.` : ""}
        textoConfirmar="Sí, cancelar entrega"
        textoCancelar="No, mantener"
        onCancelar={() => setACancelar(null)}
        onConfirmar={async () => {
          if (!aCancelar) return;
          const e = aCancelar;
          setACancelar(null);
          await ejecutar(() => cambiarEstadoEntrega(e.idEntrega, "cancelada"), "Entrega cancelada", `${e.idEntrega} · ${e.destinatario}`);
        }}
      />
    </>
  );
}
