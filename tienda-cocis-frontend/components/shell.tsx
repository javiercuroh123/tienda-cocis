"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type NombreIcono } from "./icons";
import { ToastProvider } from "./ui";
import { obtenerInventario } from "../services/inventoryService";
import { obtenerEntregas } from "../services/logisticsService";

interface ItemMenu {
  ruta: string;
  texto: string;
  icono: NombreIcono;
  contador?: "stockBajo" | "entregasPendientes";
}

const GRUPOS: { titulo: string; items: ItemMenu[] }[] = [
  { titulo: "General", items: [{ ruta: "/", texto: "Inicio", icono: "dashboard" }] },
  {
    titulo: "Inventario",
    items: [
      { ruta: "/products", texto: "Productos", icono: "paquete" },
      { ruta: "/inventory", texto: "Inventario", icono: "inventario", contador: "stockBajo" },
      { ruta: "/movements", texto: "Movimientos", icono: "movimientos" },
    ],
  },
  {
    titulo: "Logística",
    items: [
      { ruta: "/deliveries", texto: "Entregas", icono: "entregas", contador: "entregasPendientes" },
      { ruta: "/transports", texto: "Transportes", icono: "camion" },
    ],
  },
  {
    titulo: "Catálogos",
    items: [
      { ruta: "/warehouses", texto: "Almacenes", icono: "almacen" },
      { ruta: "/suppliers", texto: "Proveedores", icono: "proveedor" },
      { ruta: "/users", texto: "Usuarios", icono: "usuarios" },
    ],
  },
];

function itemActual(ruta: string) {
  for (const g of GRUPOS)
    for (const i of g.items) if (i.ruta === "/" ? ruta === "/" : ruta === i.ruta || ruta.startsWith(i.ruta + "/")) return { grupo: g.titulo, item: i };
  return null;
}

interface Resumen {
  stockBajo: number;
  entregasPendientes: number;
  conectado: boolean | null;
  recargar: () => void;
}

const ContextoResumen = createContext<Resumen>({ stockBajo: 0, entregasPendientes: 0, conectado: null, recargar: () => {} });

/** Contadores del menú: registros con stock ≤ mínimo y entregas pendientes. Las páginas llaman a recargar() tras cambiar datos. */
export function useResumen() {
  return useContext(ContextoResumen);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const ruta = usePathname() || "/";
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [resumen, setResumen] = useState({ stockBajo: 0, entregasPendientes: 0, conectado: null as boolean | null });

  const recargar = useCallback(() => {
    Promise.all([obtenerInventario("estandar"), obtenerEntregas()])
      .then(([inv, ent]) =>
        setResumen({
          stockBajo: (inv || []).filter((i) => i.stock <= i.stockMin).length,
          entregasPendientes: ent.filter((e) => e.estado === "pendiente").length,
          conectado: true,
        })
      )
      .catch(() => setResumen((r) => ({ ...r, conectado: false })));
  }, []);

  useEffect(() => {
    recargar();
    setMenuAbierto(false);
  }, [ruta, recargar]);

  const actual = itemActual(ruta);
  const subpagina = ruta.endsWith("/create") ? "Nuevo" : null;

  return (
    <ContextoResumen.Provider value={{ ...resumen, recargar }}>
      <ToastProvider>
        <div className={`app-shell${menuAbierto ? " menu-abierto" : ""}`}>
          <aside className="sidebar" aria-label="Menú principal">
            <Link href="/" className="sidebar-brand">
              <span className="logo">
                <Icon name="paquete" size={18} />
              </span>
              <span>
                <span className="sidebar-brand-name" style={{ display: "block" }}>
                  TiendaCocis
                </span>
                <span className="sidebar-brand-sub">Almacén y logística</span>
              </span>
            </Link>

            <nav className="nav">
              {GRUPOS.map((g) => (
                <div key={g.titulo} className="nav-group">
                  <p className="nav-group-label">{g.titulo}</p>
                  {g.items.map((i) => {
                    const activo = actual?.item.ruta === i.ruta;
                    const n = i.contador ? resumen[i.contador] : 0;
                    return (
                      <Link key={i.ruta} href={i.ruta} className={`nav-item${activo ? " active" : ""}`} aria-current={activo ? "page" : undefined}>
                        <Icon name={i.icono} size={18} />
                        <span className="nav-item-label">{i.texto}</span>
                        {n > 0 && (
                          <span className="nav-count" aria-label={`${n} pendientes`}>
                            {n}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="sidebar-footer">
              <span className="logo" style={{ background: "var(--sb-activo)", color: "var(--sb-texto)" }}>
                <Icon name="almacen" size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <p className="sidebar-footer-title">Panel de administración</p>
                <p className="sidebar-brand-sub">
                  <span
                    className="status-dot"
                    style={{ background: resumen.conectado === false ? "var(--peligro)" : resumen.conectado ? "var(--exito)" : "var(--neutro)" }}
                  />
                  {resumen.conectado === false ? "API sin conexión" : resumen.conectado ? "API conectada" : "Conectando…"}
                </p>
              </div>
            </div>
          </aside>
          <div className="sidebar-backdrop" onClick={() => setMenuAbierto(false)} />

          <div className="app-main">
            <header className="topbar">
              <button type="button" className="icon-btn menu-toggle" aria-label="Abrir menú" onClick={() => setMenuAbierto(true)}>
                <Icon name="menu" size={20} />
              </button>
              <div className="breadcrumbs">
                {actual ? (
                  <>
                    <span>{actual.grupo}</span>
                    <Icon name="chevron-derecha" size={14} />
                    {subpagina ? (
                      <>
                        <Link href={actual.item.ruta}>{actual.item.texto}</Link>
                        <Icon name="chevron-derecha" size={14} />
                        <strong>{subpagina}</strong>
                      </>
                    ) : (
                      <strong>{actual.item.texto}</strong>
                    )}
                  </>
                ) : (
                  <strong>TiendaCocis</strong>
                )}
              </div>
              <Link
                href="/inventory?filtro=bajo"
                className="topbar-bell"
                aria-label={resumen.stockBajo ? `${resumen.stockBajo} productos con stock bajo` : "Sin alertas de stock"}
                title={resumen.stockBajo ? `${resumen.stockBajo} con stock bajo` : "Sin alertas de stock"}
              >
                <Icon name="campana" size={18} />
                {resumen.stockBajo > 0 && <span className="topbar-bell-dot" />}
              </Link>
            </header>
            <main className="page">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </ContextoResumen.Provider>
  );
}
