"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, Input, Mensajes, Select } from "../../components/ui";
import { mensajeDeError } from "../../services/api";
import { almacenService, usuarioService } from "../../services/catalogService";
import { obtenerInventario } from "../../services/inventoryService";
import { obtenerMovimientos, registrarMovimiento } from "../../services/logisticsService";
import { obtenerProductos } from "../../services/productService";
import type {
  Almacen,
  Estrategia,
  Inventario,
  Movimiento,
  MovimientoEntrada,
  Producto,
  TipoMovimiento,
  Usuario,
} from "../../types";

const vacio: MovimientoEntrada = {
  tipo: "entrada",
  idProducto: "",
  idAlmacen: "",
  idAlmacenDestino: "",
  idUsuario: "",
  cantidad: 1,
  estrategia: "estandar",
};

export default function MovementsPage() {
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
  const [exito, setExito] = useState("");

  const cargarHistorial = async () => {
    const [movs, inv] = await Promise.all([obtenerMovimientos(filtro), obtenerInventario()]);
    setHistorial(movs);
    setInventario(inv || []);
  };

  useEffect(() => {
    (async () => {
      try {
        const [prods, alms, usrs] = await Promise.all([
          obtenerProductos(),
          almacenService.listar(),
          usuarioService.listar(),
        ]);
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

  const disponible = inventario.find(
    (i) => i.idProducto === formulario.idProducto && i.idAlmacen === formulario.idAlmacen
  )?.stock;

  const cambiar = (campo: keyof MovimientoEntrada, valor: string) =>
    setFormulario({ ...formulario, [campo]: campo === "cantidad" ? Number(valor) : valor });

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setEnviando(true);
      setError("");
      setExito("");
      const creados = await registrarMovimiento(formulario);
      const unidades = creados[creados.length - 1]?.cantidad ?? formulario.cantidad;
      setExito(`Movimiento registrado (${formulario.tipo}, ${unidades} uds).`);
      setFormulario({ ...vacio, idUsuario: formulario.idUsuario });
      await cargarHistorial();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const opcionesAlmacen = almacenes.map((a) => (
    <option key={a.idAlmacen} value={a.idAlmacen}>
      {a.nombre}
    </option>
  ));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Movimientos de inventario</h1>
          <p className="page-subtitle">
            Entradas, salidas y transferencias: cada una actualiza el stock y el historial en una sola transacción
          </p>
        </div>
      </div>

      <Mensajes error={error} exito={exito} />

      <Card title="Registrar movimiento">
        <form onSubmit={enviar} className="grid gap-4 md:grid-cols-3">
          <Select
            id="tipo"
            label="Tipo"
            value={formulario.tipo}
            onChange={(e) => cambiar("tipo", e.target.value as TipoMovimiento)}
          >
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
            <option value="transferencia">Transferencia</option>
          </Select>
          <Select
            id="idProducto"
            label="Producto"
            value={formulario.idProducto}
            onChange={(e) => cambiar("idProducto", e.target.value)}
            required
          >
            <option value="">Seleccione...</option>
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
            <option value="">Seleccione...</option>
            {opcionesAlmacen}
          </Select>
          {formulario.tipo === "transferencia" && (
            <Select
              id="idAlmacenDestino"
              label="Almacén de destino"
              value={formulario.idAlmacenDestino}
              onChange={(e) => cambiar("idAlmacenDestino", e.target.value)}
              required
            >
              <option value="">Seleccione...</option>
              {opcionesAlmacen}
            </Select>
          )}
          <Input
            id="cantidad"
            label={`Cantidad${formulario.idProducto && formulario.idAlmacen ? ` (disponible: ${disponible ?? 0})` : ""}`}
            type="number"
            min="1"
            value={formulario.cantidad}
            onChange={(e) => cambiar("cantidad", e.target.value)}
            required
          />
          {formulario.tipo === "entrada" && (
            <Select
              id="estrategia"
              label="Estrategia de ingreso"
              value={formulario.estrategia}
              onChange={(e) => cambiar("estrategia", e.target.value as Estrategia)}
            >
              <option value="estandar">Estándar</option>
              <option value="volumen">Volumen (+10% en lotes ≥ 20)</option>
              <option value="liquidacion">Liquidación (sin bonificación)</option>
            </Select>
          )}
          <Select
            id="idUsuario"
            label="Responsable"
            value={formulario.idUsuario}
            onChange={(e) => cambiar("idUsuario", e.target.value)}
            required
          >
            <option value="">Seleccione...</option>
            {usuarios.map((u) => (
              <option key={u.idUsuario} value={u.idUsuario}>
                {u.nombre}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button type="submit" disabled={enviando}>
              {enviando ? "Registrando..." : "Registrar movimiento"}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="Historial"
        subtitle="Últimos 200 movimientos. Las transferencias aparecen como una salida y una entrada vinculadas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Select
              id="filtroProducto"
              aria-label="Filtrar por producto"
              value={filtro.idProducto}
              onChange={(e) => setFiltro({ ...filtro, idProducto: e.target.value })}
            >
              <option value="">Todos los productos</option>
              {productos.map((p) => (
                <option key={p.idProducto} value={p.idProducto}>
                  {p.nombreProducto}
                </option>
              ))}
            </Select>
            <Select
              id="filtroAlmacenMov"
              aria-label="Filtrar por almacén"
              value={filtro.idAlmacen}
              onChange={(e) => setFiltro({ ...filtro, idAlmacen: e.target.value })}
            >
              <option value="">Todos los almacenes</option>
              {opcionesAlmacen}
            </Select>
          </div>
        }
      >
        {cargando ? (
          <p className="empty-state">Cargando historial...</p>
        ) : historial.length === 0 ? (
          <p className="empty-state">Aún no hay movimientos.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Almacén</th>
                  <th>Cantidad</th>
                  <th>Responsable</th>
                  <th>Transferencia</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((m) => (
                  <tr key={m.idMovimiento}>
                    <td className="mono">{new Date(m.fechaHora).toLocaleString("es-PE")}</td>
                    <td>
                      <Badge tone={m.tipo === "entrada" ? "success" : "warning"}>{m.tipo}</Badge>
                    </td>
                    <td>{m.nombreProducto}</td>
                    <td>{m.nombreAlmacen}</td>
                    <td className="mono">{m.cantidad}</td>
                    <td>{m.nombreUsuario}</td>
                    <td className="mono">{m.idTransferencia || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
