"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, Segmented, Select, SkeletonRows, usePaginacion, useToast } from "../../components/ui";
import { Icon } from "../../components/icons";
import { useResumen } from "../../components/shell";
import { mensajeDeError } from "../../services/api";
import { almacenService, usuarioService } from "../../services/catalogService";
import { obtenerInventario } from "../../services/inventoryService";
import { obtenerMovimientos, registrarMovimiento } from "../../services/logisticsService";
import { obtenerProductos } from "../../services/productService";
import { descargarCSV, diaCorto, fechaHora, hora } from "../../lib/format";
import type { Almacen, Estrategia, Inventario, Movimiento, MovimientoEntrada, Producto, TipoMovimiento, Usuario } from "../../types";

const vacio: MovimientoEntrada = {
  tipo: "entrada",
  idProducto: "",
  idAlmacen: "",
  idAlmacenDestino: "",
  idUsuario: "",
  cantidad: 1,
  estrategia: "estandar",
};

const TIPOS: { value: TipoMovimiento; label: string; icon: "entrada" | "salida" | "movimientos" }[] = [
  { value: "entrada", label: "Entrada", icon: "entrada" },
  { value: "salida", label: "Salida", icon: "salida" },
  { value: "transferencia", label: "Transferencia", icon: "movimientos" },
];

export default function MovementsPage() {
  const toast = useToast();
  const { recargar } = useResumen();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [filtro, setFiltro] = useState({ idProducto: "", idAlmacen: "" });
  const [formulario, setFormulario] = useState<MovimientoEntrada>(vacio);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [errorForm, setErrorForm] = useState("");

  const cargarHistorial = async () => {
    const [movs, inv] = await Promise.all([obtenerMovimientos(filtro), obtenerInventario()]);
    setHistorial(movs);
    setInventario(inv || []);
  };

  useEffect(() => {
    // Atajos desde otras pantallas: ?tipo=entrada&producto=prod-001&almacen=alm-principal
    const q = new URLSearchParams(window.location.search);
    const tipo = q.get("tipo");
    setFormulario((f) => ({
      ...f,
      tipo: tipo === "salida" || tipo === "transferencia" ? tipo : "entrada",
      idProducto: q.get("producto") || "",
      idAlmacen: q.get("almacen") || "",
    }));
    (async () => {
      try {
        const [prods, alms, usrs] = await Promise.all([obtenerProductos(), almacenService.listar(), usuarioService.listar()]);
        setProductos(prods || []);
        setAlmacenes(alms);
        setUsuarios(usrs);
        setFormulario((f) => ({ ...f, idUsuario: f.idUsuario || usrs[0]?.idUsuario || "" }));
      } catch (err) {
        setError(mensajeDeError(err));
      }
    })();
  }, []);

  useEffect(() => {
    setCargando(true);
    cargarHistorial()
      .catch((err) => setError(mensajeDeError(err)))
      .finally(() => setCargando(false));
  }, [filtro]);

  const pag = usePaginacion(historial, 12);

  const disponible = inventario.find((i) => i.idProducto === formulario.idProducto && i.idAlmacen === formulario.idAlmacen)?.stock ?? 0;
  const elegido = Boolean(formulario.idProducto && formulario.idAlmacen);
  const excede = formulario.tipo !== "entrada" && elegido && formulario.cantidad > disponible;
  const nombreAlmacen = (id?: string) => almacenes.find((a) => a.idAlmacen === id)?.nombre || "el almacén";

  const cambiar = (campo: keyof MovimientoEntrada, valor: string) =>
    setFormulario({ ...formulario, [campo]: campo === "cantidad" ? Number(valor) : valor });

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setEnviando(true);
      setErrorForm("");
      const creados = await registrarMovimiento(formulario);
      const unidades = creados[creados.length - 1]?.cantidad ?? formulario.cantidad;
      const producto = productos.find((p) => p.idProducto === formulario.idProducto)?.nombreProducto || "";
      const titulo = { entrada: "Entrada registrada", salida: "Salida registrada", transferencia: "Transferencia registrada" }[formulario.tipo];
      toast({ titulo, descripcion: `${unidades} uds · ${producto}` });
      setFormulario({ ...vacio, tipo: formulario.tipo, idUsuario: formulario.idUsuario });
      await cargarHistorial();
      recargar();
    } catch (err) {
      setErrorForm(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const opcionesAlmacen = almacenes.map((a) => (
    <option key={a.idAlmacen} value={a.idAlmacen}>
      {a.nombre}
    </option>
  ));

  const exportar = () =>
    descargarCSV(
      "movimientos.csv",
      ["ID", "Fecha y hora", "Tipo", "Producto", "Almacén", "Cantidad", "Responsable", "Transferencia"],
      historial.map((m) => [m.idMovimiento, fechaHora(m.fechaHora), m.tipo, m.nombreProducto || "", m.nombreAlmacen || "", m.cantidad, m.nombreUsuario || "", m.idTransferencia || ""])
    );

  const textoBoton = { entrada: "Registrar entrada", salida: "Registrar salida", transferencia: "Registrar transferencia" }[formulario.tipo];

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Entradas, salidas y transferencias entre almacenes"
        actions={
          <Button variant="secondary" icon="descargar" onClick={exportar} disabled={historial.length === 0}>
            Exportar
          </Button>
        }
      />

      {error && <Alert tone="danger" title="No se pudieron cargar los datos">{error}</Alert>}

      <div className="columnas-formulario">
        <Card title="Registrar movimiento" subtitle="El stock se actualiza al confirmar">
          <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Segmented block label="Tipo de movimiento" options={TIPOS} value={formulario.tipo} onChange={(v) => setFormulario({ ...formulario, tipo: v })} />
            {errorForm && <Alert tone="danger" title="No se registró el movimiento">{errorForm}</Alert>}
            <Select id="idProducto" label="Producto" value={formulario.idProducto} onChange={(e) => cambiar("idProducto", e.target.value)} required>
              <option value="">Seleccione…</option>
              {productos.map((p) => (
                <option key={p.idProducto} value={p.idProducto}>
                  {p.nombreProducto}
                </option>
              ))}
            </Select>
            <Select
              id="idAlmacen"
              label={formulario.tipo === "transferencia" ? "Almacén de origen" : "Almacén"}
              value={formulario.idAlmacen}
              onChange={(e) => cambiar("idAlmacen", e.target.value)}
              required
            >
              <option value="">Seleccione…</option>
              {opcionesAlmacen}
            </Select>
            {formulario.tipo === "transferencia" && (
              <Select id="idAlmacenDestino" label="Almacén de destino" value={formulario.idAlmacenDestino} onChange={(e) => cambiar("idAlmacenDestino", e.target.value)} required>
                <option value="">Seleccione…</option>
                {almacenes
                  .filter((a) => a.idAlmacen !== formulario.idAlmacen)
                  .map((a) => (
                    <option key={a.idAlmacen} value={a.idAlmacen}>
                      {a.nombre}
                    </option>
                  ))}
              </Select>
            )}
            <Input
              id="cantidad"
              label="Cantidad"
              type="number"
              min="1"
              value={formulario.cantidad}
              onChange={(e) => cambiar("cantidad", e.target.value)}
              error={excede ? `Solo hay ${disponible} uds en ${nombreAlmacen(formulario.idAlmacen)}.` : undefined}
              help={elegido ? `Disponible en ${formulario.tipo === "transferencia" ? "origen" : "el almacén"}: ${disponible} uds` : undefined}
              required
            />
            {formulario.tipo === "entrada" && (
              <Select id="estrategia" label="Estrategia de ingreso" value={formulario.estrategia} onChange={(e) => cambiar("estrategia", e.target.value as Estrategia)}>
                <option value="estandar">Estándar</option>
                <option value="volumen">Volumen (+10 % en lotes ≥ 20)</option>
                <option value="liquidacion">Liquidación (sin bonificación)</option>
              </Select>
            )}
            <Select id="idUsuario" label="Responsable" value={formulario.idUsuario} onChange={(e) => cambiar("idUsuario", e.target.value)} required>
              <option value="">Seleccione…</option>
              {usuarios.map((u) => (
                <option key={u.idUsuario} value={u.idUsuario}>
                  {u.nombre}
                </option>
              ))}
            </Select>
            {formulario.tipo === "transferencia" && formulario.idAlmacen && formulario.idAlmacenDestino && (
              <Alert tone="info" title="Se crearán dos movimientos vinculados">
                Salida de {formulario.cantidad} uds en {nombreAlmacen(formulario.idAlmacen)} y entrada en {nombreAlmacen(formulario.idAlmacenDestino)}.
              </Alert>
            )}
            <Button type="submit" block icon={TIPOS.find((t) => t.value === formulario.tipo)?.icon} disabled={enviando || excede}>
              {enviando ? "Registrando…" : textoBoton}
            </Button>
          </form>
        </Card>

        <Card flush title="Historial" subtitle="Últimos 200 movimientos. Las transferencias se muestran como una salida y una entrada vinculadas.">
          <div className="toolbar">
            <div style={{ width: 200, maxWidth: "100%" }}>
              <Select aria-label="Filtrar por almacén" value={filtro.idAlmacen} onChange={(e) => setFiltro({ ...filtro, idAlmacen: e.target.value })}>
                <option value="">Todos los almacenes</option>
                {opcionesAlmacen}
              </Select>
            </div>
            <div style={{ width: 220, maxWidth: "100%" }}>
              <Select aria-label="Filtrar por producto" value={filtro.idProducto} onChange={(e) => setFiltro({ ...filtro, idProducto: e.target.value })}>
                <option value="">Todos los productos</option>
                {productos.map((p) => (
                  <option key={p.idProducto} value={p.idProducto}>
                    {p.nombreProducto}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {cargando ? (
            <SkeletonRows rows={6} cols={4} />
          ) : historial.length === 0 ? (
            <EmptyState icon="movimientos" title="Aún no hay movimientos" description="Registra una entrada para empezar a llevar el historial." />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Producto</th>
                      <th className="derecha">Cant.</th>
                      <th>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pag.visibles.map((m) => {
                      const entrada = m.tipo === "entrada";
                      return (
                        <tr key={m.idMovimiento} className={m.idTransferencia ? "fila-resaltada" : undefined}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <p style={{ fontSize: 13, fontWeight: 500 }}>{diaCorto(m.fechaHora)}</p>
                            <p className="cell-sub">{hora(m.fechaHora)}</p>
                          </td>
                          <td>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <Badge tone={entrada ? "success" : "warning"} dot>
                                {entrada ? "Entrada" : "Salida"}
                              </Badge>
                              {m.idTransferencia && (
                                <span title={`Transferencia ${m.idTransferencia}`} style={{ color: "var(--texto-3)", display: "inline-flex" }}>
                                  <Icon name="enlace" size={14} />
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            <p className="cell-main">{m.nombreProducto}</p>
                            <p className="cell-sub">{m.idTransferencia ? `${m.idTransferencia} · ${entrada ? "hacia" : "desde"} ${m.nombreAlmacen}` : m.nombreAlmacen}</p>
                          </td>
                          <td className="derecha num" style={{ fontWeight: 600, color: entrada ? "var(--exito-fg)" : "var(--adv-fg)" }}>
                            {entrada ? "+" : "−"}
                            {m.cantidad}
                          </td>
                          <td className="cell-muted">{m.nombreUsuario}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination {...pag} sustantivo="movimientos" />
            </>
          )}
        </Card>
      </div>
    </>
  );
}
