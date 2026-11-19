"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Avatar,
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
import type { NombreIcono } from "./icons";
import { mensajeDeError } from "../services/api";
import type { ServicioCatalogo } from "../services/catalogService";

export interface CampoCatalogo<T> {
  nombre: keyof T & string;
  etiqueta: string;
  tipo?: "text" | "email" | "tel" | "select";
  opciones?: { valor: string; etiqueta: string }[];
  placeholder?: string;
  /** Cómo se muestra el valor en la tabla (por defecto, el texto tal cual). */
  formato?: (valor: T) => ReactNode;
  ancho?: number;
}

interface CatalogPageProps<T> {
  titulo: string;
  subtitulo: string;
  /** Singular y plural para botones y contadores, p. ej. ["proveedor", "proveedores"]. */
  sustantivo: [string, string];
  icono: NombreIcono;
  servicio: ServicioCatalogo<T>;
  clave: keyof T & string;
  /** El primer campo es la columna principal; el resto, columnas adicionales. */
  campos: CampoCatalogo<T>[];
  vacio: T;
  /** Muestra un avatar con iniciales junto a la columna principal. */
  avatar?: boolean;
  /** Campos adicionales del formulario (p. ej. productos de un proveedor). */
  extraFormulario?: (valor: T, cambiar: (nuevo: T) => void) => ReactNode;
  columnaExtra?: { titulo: string; celda: (valor: T) => ReactNode; ancho?: number };
  /** Contenido sobre la tabla (p. ej. resumen por tipo de vehículo). */
  resumen?: (lista: T[]) => ReactNode;
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Listado con búsqueda + panel lateral de registro/edición para usuarios, proveedores, almacenes y transportes. */
export default function CatalogPage<T>({
  titulo,
  subtitulo,
  sustantivo: [singular, plural],
  icono,
  servicio,
  clave,
  campos,
  vacio,
  avatar,
  extraFormulario,
  columnaExtra,
  resumen,
}: CatalogPageProps<T>) {
  const toast = useToast();
  const [lista, setLista] = useState<T[]>([]);
  const [formulario, setFormulario] = useState<T>(vacio);
  const [panel, setPanel] = useState<null | "nuevo" | string>(null);
  const [aEliminar, setAEliminar] = useState<T | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [errorPanel, setErrorPanel] = useState("");

  const id = (valor: T) => String(valor[clave]);
  const [principal, ...secundarios] = campos;
  const texto = (valor: T, c: CampoCatalogo<T>) => {
    const v = String(valor[c.nombre] ?? "");
    return c.opciones?.find((o) => o.valor === v)?.etiqueta ?? v;
  };

  const cargar = async () => {
    try {
      setError("");
      setLista(await servicio.listar());
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((v) => id(v).toLowerCase().includes(q) || campos.some((c) => texto(v, c).toLowerCase().includes(q)));
  }, [lista, busqueda]);
  const pag = usePaginacion(filtrados, 10);

  const abrir = (valor: T | null) => {
    setErrorPanel("");
    setFormulario(valor ?? vacio);
    setPanel(valor ? id(valor) : "nuevo");
  };

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setEnviando(true);
      setErrorPanel("");
      const nombre = texto(formulario, principal);
      if (panel && panel !== "nuevo") {
        await servicio.actualizar(panel, formulario);
        toast({ titulo: "Cambios guardados", descripcion: nombre });
      } else {
        await servicio.crear(formulario);
        toast({ titulo: `${mayuscula(singular)} registrado`, descripcion: nombre });
      }
      setPanel(null);
      await cargar();
    } catch (err) {
      setErrorPanel(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (valor: T) => {
    try {
      setError("");
      await servicio.eliminar(id(valor));
      toast({ titulo: `${mayuscula(singular)} eliminado`, descripcion: texto(valor, principal) });
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  const editando = panel && panel !== "nuevo" ? panel : null;

  return (
    <>
      <PageHeader
        title={titulo}
        subtitle={subtitulo}
        actions={
          <Button icon="mas" onClick={() => abrir(null)}>
            Nuevo {singular}
          </Button>
        }
      />

      {error && <Alert tone="danger" title="No se pudo completar la operación">{error}</Alert>}

      {!cargando && resumen?.(lista)}

      <Card flush>
        <div className="toolbar">
          <div style={{ width: 320, maxWidth: "100%" }}>
            <Input icon="buscar" placeholder={`Buscar ${singular}…`} aria-label={`Buscar ${singular}`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <span className="toolbar-spacer" />
          <span className="toolbar-meta">
            {filtrados.length} {filtrados.length === 1 ? singular : plural}
          </span>
        </div>

        {cargando ? (
          <SkeletonRows rows={4} cols={campos.length + 1} />
        ) : filtrados.length === 0 ? (
          lista.length === 0 ? (
            <EmptyState
              icon={icono}
              title={`Aún no hay ${plural}`}
              description={`Registra el primer ${singular} para empezar.`}
              action={
                <Button icon="mas" onClick={() => abrir(null)}>
                  Nuevo {singular}
                </Button>
              }
            />
          ) : (
            <EmptyState icon="buscar" title="Sin resultados" description="Nada coincide con la búsqueda." />
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{principal.etiqueta}</th>
                    {secundarios.map((c) => (
                      <th key={c.nombre} style={c.ancho ? { width: c.ancho } : undefined}>
                        {c.etiqueta}
                      </th>
                    ))}
                    {columnaExtra && <th style={columnaExtra.ancho ? { width: columnaExtra.ancho } : undefined}>{columnaExtra.titulo}</th>}
                    <th className="derecha" style={{ width: 96 }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pag.visibles.map((valor) => (
                    <tr key={id(valor)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {avatar && <Avatar nombre={texto(valor, principal)} />}
                          <div>
                            <p className="cell-main">{principal.formato ? principal.formato(valor) : texto(valor, principal)}</p>
                            <p className="cell-sub mono">{id(valor)}</p>
                          </div>
                        </div>
                      </td>
                      {secundarios.map((c) => (
                        <td key={c.nombre} className="cell-muted">
                          {c.formato ? c.formato(valor) : texto(valor, c) || "—"}
                        </td>
                      ))}
                      {columnaExtra && <td>{columnaExtra.celda(valor)}</td>}
                      <td className="derecha">
                        <div className="row-actions">
                          <IconButton icon="editar" label={`Editar ${texto(valor, principal)}`} onClick={() => abrir(valor)} />
                          <IconButton icon="eliminar" tone="danger" label={`Eliminar ${texto(valor, principal)}`} onClick={() => setAEliminar(valor)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...pag} sustantivo={plural} />
          </>
        )}
      </Card>

      <Drawer
        abierto={panel !== null}
        titulo={editando ? `Editar ${singular}` : `Nuevo ${singular}`}
        subtitulo={editando ?? "El ID se genera automáticamente."}
        onCerrar={() => setPanel(null)}
        onSubmit={guardar}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : `Registrar ${singular}`}
            </Button>
          </>
        }
      >
        {errorPanel && <Alert tone="danger" title="Revisa los datos">{errorPanel}</Alert>}
        {campos.map((c, k) =>
          c.tipo === "select" ? (
            <Select
              key={c.nombre}
              id={c.nombre}
              label={c.etiqueta}
              value={String(formulario[c.nombre] ?? "")}
              onChange={(e) => setFormulario({ ...formulario, [c.nombre]: e.target.value })}
              required
            >
              <option value="">Seleccione…</option>
              {c.opciones?.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              key={c.nombre}
              id={c.nombre}
              label={c.etiqueta}
              type={c.tipo || "text"}
              placeholder={c.placeholder}
              value={String(formulario[c.nombre] ?? "")}
              onChange={(e) => setFormulario({ ...formulario, [c.nombre]: e.target.value })}
              required
              autoFocus={k === 0}
            />
          )
        )}
        {extraFormulario?.(formulario, setFormulario)}
      </Drawer>

      <ConfirmModal
        abierto={Boolean(aEliminar)}
        titulo={`¿Eliminar este ${singular}?`}
        mensaje={aEliminar ? `Se eliminará "${texto(aEliminar, principal)}" (${id(aEliminar)}). Esta acción no se puede deshacer.` : ""}
        onCancelar={() => setAEliminar(null)}
        onConfirmar={async () => {
          if (!aEliminar) return;
          const valor = aEliminar;
          setAEliminar(null);
          await eliminar(valor);
        }}
      />
    </>
  );
}
