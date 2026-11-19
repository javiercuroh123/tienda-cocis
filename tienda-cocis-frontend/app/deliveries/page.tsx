"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, ConfirmModal, Input, Mensajes, Select } from "../../components/ui";
import { mensajeDeError } from "../../services/api";
import { transporteService } from "../../services/catalogService";
import {
  actualizarDetallesEntrega,
  cambiarEstadoEntrega,
  crearEntrega,
  obtenerEntregas,
} from "../../services/logisticsService";
import { obtenerProductos } from "../../services/productService";
import type { DetalleEntrega, Entrega, EstadoEntrega, Producto, Transporte } from "../../types";

const etiquetas: Record<EstadoEntrega, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_transito: "En tránsito",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

const tonos: Record<EstadoEntrega, "neutral" | "success" | "warning" | "danger"> = {
  pendiente: "neutral",
  asignada: "warning",
  en_transito: "warning",
  entregada: "success",
  cancelada: "danger",
};

/** Botón que lleva a cada estado siguiente (la asignación tiene su propio control). */
const acciones: Partial<Record<EstadoEntrega, string>> = {
  en_transito: "Despachar",
  entregada: "Marcar entregada",
  cancelada: "Cancelar",
};

// Fecha local AAAA-MM-DD (toISOString usaría UTC y daría el día siguiente por la noche en Perú).
const hoy = () => new Date().toLocaleDateString("en-CA");
const nuevaLinea = (): DetalleEntrega => ({ idProducto: "", cantidad: 1 });

export default function DeliveriesPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [destinatario, setDestinatario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [lineas, setLineas] = useState<DetalleEntrega[]>([nuevaLinea()]);
  const [editando, setEditando] = useState<Entrega | null>(null);
  const [vehiculo, setVehiculo] = useState<Record<string, string>>({});
  const [aCancelar, setACancelar] = useState<Entrega | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

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
    cargar();
    Promise.all([obtenerProductos(), transporteService.listar()])
      .then(([prods, trps]) => {
        setProductos(prods || []);
        setTransportes(trps);
      })
      .catch((err) => setError(mensajeDeError(err)));
  }, []);

  const reiniciar = () => {
    setDestinatario("");
    setDireccion("");
    setFecha(hoy());
    setLineas([nuevaLinea()]);
    setEditando(null);
  };

  /** Ejecuta una operación, muestra su resultado y vuelve a consultar la lista. */
  const ejecutar = async (operacion: () => Promise<unknown>, mensaje: string) => {
    try {
      setError("");
      setExito("");
      await operacion();
      setExito(mensaje);
      await cargar();
      return true;
    } catch (err) {
      setError(mensajeDeError(err));
      return false;
    }
  };

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    const detalles = lineas.map((l) => ({ idProducto: l.idProducto, cantidad: Number(l.cantidad) }));
    const ok = editando
      ? await ejecutar(() => actualizarDetallesEntrega(editando.idEntrega, detalles), "Productos actualizados.")
      : await ejecutar(() => crearEntrega({ destinatario, direccion, fecha, detalles }), "Entrega creada.");
    if (ok) reiniciar();
    setEnviando(false);
  };

  const cambiarLinea = (i: number, cambio: Partial<DetalleEntrega>) =>
    setLineas(lineas.map((l, j) => (j === i ? { ...l, ...cambio } : l)));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Entregas</h1>
          <p className="page-subtitle">
            Pendiente → Asignada → En tránsito → Entregada. Despachar no descuenta stock: registra la salida en
            Movimientos.
          </p>
        </div>
      </div>

      <Mensajes error={error} exito={exito} />

      <Card title={editando ? `Editar productos de ${editando.idEntrega}` : "Nueva entrega"}>
        <form onSubmit={guardar} className="space-y-4">
          {!editando && (
            <div className="grid gap-4 md:grid-cols-3">
              <Input id="destinatario" label="Destinatario" value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)} required />
              <Input id="direccion" label="Dirección" value={direccion}
                onChange={(e) => setDireccion(e.target.value)} required />
              <Input id="fecha" label="Fecha" type="date" value={fecha}
                onChange={(e) => setFecha(e.target.value)} required />
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Productos y cantidades</p>
            {lineas.map((linea, i) => (
              <div key={i} className="grid grid-cols-[1fr_8rem_auto] items-end gap-2">
                <Select id={`producto-${i}`} aria-label="Producto" value={linea.idProducto}
                  onChange={(e) => cambiarLinea(i, { idProducto: e.target.value })} required>
                  <option value="">Seleccione un producto...</option>
                  {productos.map((p) => (
                    <option key={p.idProducto} value={p.idProducto}>{p.nombreProducto}</option>
                  ))}
                </Select>
                <Input id={`cantidad-${i}`} aria-label="Cantidad" type="number" min="1" value={linea.cantidad}
                  onChange={(e) => cambiarLinea(i, { cantidad: Number(e.target.value) })} required />
                <Button variant="ghost" disabled={lineas.length === 1}
                  onClick={() => setLineas(lineas.filter((_, j) => j !== i))}>
                  Quitar
                </Button>
              </div>
            ))}
            <Button variant="ghost" onClick={() => setLineas([...lineas, nuevaLinea()])}>
              + Agregar producto
            </Button>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : editando ? "Guardar productos" : "Crear entrega"}
            </Button>
            {editando && (
              <Button variant="ghost" onClick={reiniciar}>Cancelar edición</Button>
            )}
          </div>
        </form>
      </Card>

      <Card title={`Entregas (${entregas.length})`}>
        {cargando ? (
          <p className="empty-state">Cargando entregas...</p>
        ) : entregas.length === 0 ? (
          <p className="empty-state">No hay entregas registradas.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Entrega</th>
                  <th>Destinatario</th>
                  <th>Productos</th>
                  <th>Estado</th>
                  <th>Vehículo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((e) => (
                  <tr key={e.idEntrega}>
                    <td>
                      <div className="mono">{e.idEntrega}</div>
                      <div className="text-xs text-zinc-500">{e.fecha}</div>
                    </td>
                    <td>
                      <strong>{e.destinatario}</strong>
                      <div className="text-xs text-zinc-500">{e.direccion}</div>
                    </td>
                    <td>
                      <ul className="text-sm">
                        {e.detalles.map((d) => (
                          <li key={d.idProducto}>{d.cantidad} × {d.nombreProducto}</li>
                        ))}
                      </ul>
                    </td>
                    <td><Badge tone={tonos[e.estado]}>{etiquetas[e.estado]}</Badge></td>
                    <td className="mono">{e.placa || "—"}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        {e.siguientes.includes("asignada") && (
                          <>
                            <Select id={`vehiculo-${e.idEntrega}`} aria-label="Vehículo"
                              value={vehiculo[e.idEntrega] || ""}
                              onChange={(ev) => setVehiculo({ ...vehiculo, [e.idEntrega]: ev.target.value })}>
                              <option value="">Vehículo...</option>
                              {transportes.map((t) => (
                                <option key={t.idTransporte} value={t.idTransporte}>{t.placa} · {t.conductor}</option>
                              ))}
                            </Select>
                            <Button onClick={() => ejecutar(
                              () => cambiarEstadoEntrega(e.idEntrega, "asignada", vehiculo[e.idEntrega] || ""),
                              "Vehículo asignado.")}>
                              Asignar
                            </Button>
                          </>
                        )}
                        {e.siguientes.filter((s) => acciones[s]).map((s) => (
                          <Button key={s} variant={s === "cancelada" ? "danger" : "ghost"}
                            onClick={() => s === "cancelada"
                              ? setACancelar(e)
                              : ejecutar(() => cambiarEstadoEntrega(e.idEntrega, s), `Entrega ${etiquetas[s].toLowerCase()}.`)}>
                            {acciones[s]}
                          </Button>
                        ))}
                        {(e.estado === "pendiente" || e.estado === "asignada") && (
                          <Button variant="ghost" onClick={() => {
                            setEditando(e);
                            setLineas(e.detalles.map((d) => ({ idProducto: d.idProducto, cantidad: d.cantidad })));
                          }}>
                            Editar productos
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        abierto={Boolean(aCancelar)}
        titulo="Cancelar entrega"
        mensaje={aCancelar ? `¿Cancelar la entrega ${aCancelar.idEntrega} para ${aCancelar.destinatario}?` : ""}
        textoConfirmar="Sí, cancelar entrega"
        onCancelar={() => setACancelar(null)}
        onConfirmar={async () => {
          if (!aCancelar) return;
          const id = aCancelar.idEntrega;
          setACancelar(null);
          await ejecutar(() => cambiarEstadoEntrega(id, "cancelada"), "Entrega cancelada.");
        }}
      />
    </>
  );
}
