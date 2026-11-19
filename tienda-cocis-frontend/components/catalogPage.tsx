"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, Card, ConfirmModal, Input, Mensajes, Select } from "./ui";
import { mensajeDeError } from "../services/api";
import type { ServicioCatalogo } from "../services/catalogService";

export interface CampoCatalogo<T> {
  nombre: keyof T & string;
  etiqueta: string;
  tipo?: "text" | "email" | "tel" | "select";
  opciones?: { valor: string; etiqueta: string }[];
}

interface CatalogPageProps<T> {
  titulo: string;
  subtitulo: string;
  servicio: ServicioCatalogo<T>;
  clave: keyof T & string;
  campos: CampoCatalogo<T>[];
  vacio: T;
  /** Campos adicionales del formulario (p. ej. productos de un proveedor). */
  extraFormulario?: (valor: T, cambiar: (nuevo: T) => void) => ReactNode;
  columnaExtra?: { titulo: string; celda: (valor: T) => ReactNode };
}

/** Listado + formulario de registro/edición para usuarios, proveedores, almacenes y transportes. */
export default function CatalogPage<T>({
  titulo,
  subtitulo,
  servicio,
  clave,
  campos,
  vacio,
  extraFormulario,
  columnaExtra,
}: CatalogPageProps<T>) {
  const [lista, setLista] = useState<T[]>([]);
  const [formulario, setFormulario] = useState<T>(vacio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aEliminar, setAEliminar] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const id = (valor: T) => String(valor[clave]);

  const cargar = async () => {
    try {
      setCargando(true);
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

  const reiniciar = () => {
    setFormulario(vacio);
    setEditandoId(null);
  };

  const guardar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setEnviando(true);
      setError("");
      setExito("");
      if (editandoId) {
        await servicio.actualizar(editandoId, formulario);
        setExito("Cambios guardados.");
      } else {
        await servicio.crear(formulario);
        setExito("Registro creado.");
      }
      reiniciar();
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const eliminar = async (valor: T) => {
    try {
      setError("");
      setExito("");
      await servicio.eliminar(id(valor));
      setExito("Registro eliminado.");
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{titulo}</h1>
          <p className="page-subtitle">{subtitulo}</p>
        </div>
      </div>

      <Mensajes error={error} exito={exito} />

      <Card title={editandoId ? `Editar ${editandoId}` : "Nuevo registro"}>
        <form onSubmit={guardar} className="form-grid">
          {campos.map((c) =>
            c.tipo === "select" ? (
              <Select
                key={c.nombre}
                id={c.nombre}
                label={c.etiqueta}
                value={String(formulario[c.nombre] ?? "")}
                onChange={(e) => setFormulario({ ...formulario, [c.nombre]: e.target.value })}
                required
              >
                <option value="">Seleccione...</option>
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
                value={String(formulario[c.nombre] ?? "")}
                onChange={(e) => setFormulario({ ...formulario, [c.nombre]: e.target.value })}
                required
              />
            )
          )}
          {extraFormulario?.(formulario, setFormulario)}
          <div className="flex gap-2">
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : editandoId ? "Guardar cambios" : "Registrar"}
            </Button>
            {editandoId && (
              <Button variant="ghost" onClick={reiniciar}>
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title={`Listado (${lista.length})`}>
        {cargando ? (
          <p className="empty-state">Cargando...</p>
        ) : lista.length === 0 ? (
          <p className="empty-state">No hay registros todavía.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  {campos.map((c) => (
                    <th key={c.nombre}>{c.etiqueta}</th>
                  ))}
                  {columnaExtra && <th>{columnaExtra.titulo}</th>}
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((valor) => (
                  <tr key={id(valor)}>
                    <td className="mono">{id(valor)}</td>
                    {campos.map((c) => (
                      <td key={c.nombre}>{String(valor[c.nombre] ?? "")}</td>
                    ))}
                    {columnaExtra && <td>{columnaExtra.celda(valor)}</td>}
                    <td>
                      <div className="row-actions">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setFormulario(valor);
                            setEditandoId(id(valor));
                          }}
                        >
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => setAEliminar(valor)}>
                          Eliminar
                        </Button>
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
        abierto={Boolean(aEliminar)}
        titulo="Confirmar eliminación"
        mensaje={aEliminar ? `¿Eliminar el registro ${id(aEliminar)}?` : ""}
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
