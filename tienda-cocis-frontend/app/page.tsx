"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { obtenerProductos } from "../services/productService";
import { obtenerInventario } from "../services/inventoryService";
import { obtenerEntregas, obtenerMovimientos } from "../services/logisticsService";
import { Alert, Button, Card, EmptyState, PageHeader, SkeletonRows, StatCard, StockBar } from "../components/ui";
import { Icon } from "../components/icons";
import { mensajeDeError } from "../services/api";
import { haceCuanto, soles } from "../lib/format";
import type { Entrega, EstadoEntrega, Inventario, Movimiento, Producto } from "../types";

const ESTADOS: { estado: EstadoEntrega; etiqueta: string; color: string }[] = [
  { estado: "pendiente", etiqueta: "Pendiente", color: "var(--neutro)" },
  { estado: "asignada", etiqueta: "Asignada", color: "var(--info)" },
  { estado: "en_transito", etiqueta: "En tránsito", color: "var(--adv)" },
  { estado: "entregada", etiqueta: "Entregada", color: "var(--exito)" },
  { estado: "cancelada", etiqueta: "Cancelada", color: "var(--peligro)" },
];

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Clave local AAAA-MM-DD de una fecha. */
const claveDia = (d: Date) => d.toLocaleDateString("en-CA");

export default function DashboardPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, i, e, m] = await Promise.all([obtenerProductos(), obtenerInventario("estandar"), obtenerEntregas(), obtenerMovimientos()]);
        setProductos(p || []);
        setInventario(i || []);
        setEntregas(e);
        setMovimientos(m);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const alertas = inventario.filter((i) => i.stock <= i.stockMin).sort((a, b) => a.stock / Math.max(1, a.stockMin) - b.stock / Math.max(1, b.stockMin));
  const valorTotal = inventario.reduce((acc, i) => acc + (Number(i.valorCalculado) || 0), 0);
  const categorias = new Set(productos.map((p) => p.categoria)).size;
  const almacenes = new Set(inventario.map((i) => i.idAlmacen)).size;

  // Entradas y salidas por día en los últimos 7 días (sobre los últimos 200 movimientos).
  const semana = useMemo(() => {
    const dias = Array.from({ length: 7 }, (_, k) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - k));
      return { clave: claveDia(d), etiqueta: d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" }).replace(".", ""), entradas: 0, salidas: 0 };
    });
    for (const m of movimientos) {
      const dia = dias.find((d) => d.clave === claveDia(new Date(m.fechaHora)));
      if (dia) dia[m.tipo === "entrada" ? "entradas" : "salidas"] += m.cantidad;
    }
    return dias;
  }, [movimientos]);
  const maxSemana = Math.max(1, ...semana.map((d) => Math.max(d.entradas, d.salidas)));
  const totalEntradas = semana.reduce((a, d) => a + d.entradas, 0);
  const totalSalidas = semana.reduce((a, d) => a + d.salidas, 0);
  const maxEstado = Math.max(1, ...ESTADOS.map((s) => entregas.filter((e) => e.estado === s.estado).length));

  return (
    <>
      <PageHeader
        title={`${saludo()}`}
        subtitle={`Resumen del almacén · ${new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "short", year: "numeric" }).replace(".", "")}`}
        actions={
          <>
            <Link href="/movements">
              <Button variant="secondary" icon="movimientos">
                Registrar movimiento
              </Button>
            </Link>
            <Link href="/products/create">
              <Button icon="mas">Nuevo producto</Button>
            </Link>
          </>
        }
      />

      {error && <Alert tone="danger" title="No se pudo cargar el resumen">{error}</Alert>}

      <div className="kpi-grid">
        <StatCard label="Productos registrados" value={productos.length} detail={`En ${categorias} ${categorias === 1 ? "categoría" : "categorías"}`} icon="paquete" loading={cargando} />
        <StatCard label="Registros en almacén" value={inventario.length} detail={`En ${almacenes} ${almacenes === 1 ? "almacén" : "almacenes"}`} icon="inventario" loading={cargando} />
        <StatCard
          label="Alertas de stock mínimo"
          value={alertas.length}
          detail={alertas.length ? "Requieren reposición" : "Todo sobre el mínimo"}
          icon="alerta"
          alert={alertas.length > 0}
          loading={cargando}
        />
        <StatCard label="Valor del almacén" value={soles(valorTotal)} detail="Valorización estándar" icon="billetera" loading={cargando} />
      </div>

      <div className="dos-columnas">
        <Card
          flush
          title="Reponer pronto"
          subtitle="Productos con stock actual menor o igual al mínimo"
          actions={
            <Link href="/inventory?filtro=bajo">
              <Button variant="secondary" size="sm" icon="flecha-derecha">
                Ver inventario
              </Button>
            </Link>
          }
        >
          {cargando ? (
            <SkeletonRows rows={3} cols={4} />
          ) : alertas.length === 0 ? (
            <EmptyState ok title="Todo en orden" description="Todo el inventario está por encima del stock mínimo." />
          ) : (
            <div className="table-wrap">
              <table className="table table-compacta">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock</th>
                    <th className="derecha">Mínimo</th>
                    <th>Faltante</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {alertas.slice(0, 5).map((i) => (
                    <tr key={i.idInventorio}>
                      <td className="cell-producto">
                        <p className="cell-main">{i.nombreProducto}</p>
                        <p className="cell-sub">
                          {i.idInventorio} · {i.nombreAlmacen}
                        </p>
                      </td>
                      <td>
                        <StockBar stock={i.stock} stockMin={i.stockMin} />
                      </td>
                      <td className="derecha num">{i.stockMin}</td>
                      <td style={{ color: "var(--adv-fg)", fontWeight: 500, fontSize: 13 }}>
                        {i.stockMin > i.stock ? `Faltan ${i.stockMin - i.stock}` : "En el mínimo"}
                      </td>
                      <td className="derecha nowrap">
                        <Link href={`/movements?tipo=entrada&producto=${i.idProducto}&almacen=${i.idAlmacen}`}>
                          <Button variant="secondary" size="sm" icon="entrada">
                            Registrar entrada
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Entregas por estado" subtitle={`${entregas.length} entregas registradas`}>
          {cargando ? (
            <SkeletonRows rows={2} cols={1} />
          ) : (
            ESTADOS.map((s) => {
              const n = entregas.filter((e) => e.estado === s.estado).length;
              return (
                <Link key={s.estado} href={`/deliveries?estado=${s.estado}`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color }} />
                    <span style={{ flex: 1, color: "var(--texto-2)" }}>{s.etiqueta}</span>
                    <strong className="num" style={{ fontWeight: 600 }}>
                      {n}
                    </strong>
                  </span>
                  <span className="progress-track">
                    <span className="progress-fill" style={{ display: "block", width: `${(n / maxEstado) * 100}%`, background: s.color }} />
                  </span>
                </Link>
              );
            })
          )}
        </Card>
      </div>

      <div className="dos-columnas">
        <Card title="Movimientos · últimos 7 días" subtitle="Unidades que entraron y salieron de todos los almacenes">
          <div className="legend">
            <span>
              <span className="legend-swatch" style={{ background: "var(--exito)" }} />
              Entradas <strong style={{ color: "var(--texto)", fontWeight: 500 }}>{totalEntradas} uds</strong>
            </span>
            <span>
              <span className="legend-swatch" style={{ background: "var(--adv)" }} />
              Salidas <strong style={{ color: "var(--texto)", fontWeight: 500 }}>{totalSalidas} uds</strong>
            </span>
          </div>
          <div className="chart" role="img" aria-label={`Entradas ${totalEntradas} y salidas ${totalSalidas} unidades en los últimos 7 días`}>
            {[0.25, 0.5, 0.75].map((f) => (
              <span key={f} className="chart-guide" style={{ bottom: `calc(28px + ${f} * (100% - 28px))` }} />
            ))}
            {semana.map((d, k) => (
              <div key={d.clave} className="chart-col">
                <div className="chart-bars">
                  <span className="chart-bar" title={`${d.entradas} uds de entrada`} style={{ height: `${(d.entradas / maxSemana) * 100}%`, background: "var(--exito)" }} />
                  <span className="chart-bar" title={`${d.salidas} uds de salida`} style={{ height: `${(d.salidas / maxSemana) * 100}%`, background: "var(--adv)" }} />
                </div>
                <span className="chart-label" style={k === 6 ? { color: "var(--texto)", fontWeight: 500 } : undefined}>
                  {d.etiqueta}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Actividad reciente" subtitle="Últimos movimientos registrados">
          {cargando ? (
            <SkeletonRows rows={3} cols={1} />
          ) : movimientos.length === 0 ? (
            <p style={{ color: "var(--texto-2)" }}>Aún no hay movimientos.</p>
          ) : (
            movimientos.slice(0, 5).map((m) => {
              const entrada = m.tipo === "entrada";
              return (
                <div key={m.idMovimiento} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="activity-icon" style={{ background: entrada ? "var(--exito-bg)" : "var(--adv-bg)", color: entrada ? "var(--exito-fg)" : "var(--adv-fg)" }}>
                    <Icon name={entrada ? "entrada" : "salida"} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>
                      {entrada ? "Entrada" : "Salida"} de {m.cantidad} uds
                    </p>
                    <p className="cell-sub">
                      {m.nombreProducto} · {m.idTransferencia ? `Transferencia · ${m.nombreAlmacen}` : m.nombreAlmacen}
                    </p>
                  </div>
                  <span className="cell-sub" style={{ whiteSpace: "nowrap" }}>
                    {haceCuanto(m.fechaHora)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </>
  );
}
