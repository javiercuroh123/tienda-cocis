"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerInventario, eliminarInventario } from "../../services/inventoryService";
import { almacenService } from "../../services/catalogService";
import { Card, Badge, Button, Select, ConfirmModal, Mensajes } from "../../components/ui";
import { mensajeDeError } from "../../services/api";
import type { Almacen, Estrategia, Inventario } from "../../types";

export default function InventoryPage() {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [idAlmacen, setIdAlmacen] = useState("");
  const [estrategia, setEstrategia] = useState<Estrategia>("estandar");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [itemAEliminar, setItemAEliminar] = useState<Inventario | null>(null);

  const cargarDatos = async (estrategiaSeleccionada: Estrategia = estrategia) => {
    try {
      setCargando(true);
      setError("");
      const [listaInv, listaAlm] = await Promise.all([
        obtenerInventario(estrategiaSeleccionada, idAlmacen),
        almacenService.listar(),
      ]);
      setInventario(listaInv || []);
      setAlmacenes(listaAlm);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos(estrategia);
  }, [estrategia, idAlmacen]);

  const manejarEliminar = async (idInventorio: string) => {
    try {
      setError("");
      await eliminarInventario(idInventorio);
      await cargarDatos(estrategia);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Almacén (Inventario)</h1>
          <p className="page-subtitle">
            Existencias por producto y almacén · valoración con el Patrón Strategy
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            id="filtroAlmacen"
            label="Almacén"
            value={idAlmacen}
            onChange={(e) => setIdAlmacen(e.target.value)}
          >
            <option value="">Todos los almacenes</option>
            {almacenes.map((a) => (
              <option key={a.idAlmacen} value={a.idAlmacen}>
                {a.nombre}
              </option>
            ))}
          </Select>
          <Select
            id="selectorEstrategiaGlobal"
            label="Estrategia activa de visualización"
            value={estrategia}
            onChange={(e) => setEstrategia(e.target.value as Estrategia)}
          >
            <option value="estandar">Estrategia Estándar (100% valor)</option>
            <option value="liquidacion">Estrategia Liquidación (-30% precio)</option>
            <option value="volumen">Estrategia por Volumen (bonificación ≥20 uds)</option>
          </Select>
          <Link href="/movements">
            <Button>Registrar movimiento</Button>
          </Link>
        </div>
      </div>

      <Mensajes error={error} />

      <Card
        title="Existencias en Almacén"
        subtitle={`Mostrando valoración bajo estrategia: ${estrategia.toUpperCase()}. Las cantidades cambian solo con entradas, salidas y transferencias.`}
      >
        {cargando ? (
          <p className="empty-state">Cargando inventario...</p>
        ) : inventario.length === 0 ? (
          <p className="empty-state">No hay registros en el almacén.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID (idInventorio)</th>
                  <th>Producto Peruano</th>
                  <th>Almacén</th>
                  <th>Precio Base (S/)</th>
                  <th>Stock</th>
                  <th>Stock Mín</th>
                  <th>Estado</th>
                  <th>Valor Calculado S/ (Strategy)</th>
                  <th>Última Actualización</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map((item) => {
                  const alerta = item.stock <= item.stockMin;
                  return (
                    <tr key={item.idInventorio}>
                      <td className="mono">{item.idInventorio}</td>
                      <td>
                        <strong>{item.nombreProducto}</strong>
                        <div className="mono" style={{ color: "#71717a", fontSize: "0.75rem" }}>
                          {item.idProducto}
                        </div>
                      </td>
                      <td>{item.nombreAlmacen}</td>
                      <td className="mono">S/ {Number(item.precioUnidad).toFixed(2)}</td>
                      <td className="mono">{item.stock}</td>
                      <td className="mono">{item.stockMin}</td>
                      <td>
                        {alerta ? (
                          <Badge tone="danger">Bajo Stock</Badge>
                        ) : (
                          <Badge tone="success">Óptimo</Badge>
                        )}
                      </td>
                      <td className="mono">
                        <strong>S/ {Number(item.valorCalculado).toFixed(2)}</strong>{" "}
                        <Badge tone="neutral">{item.estrategiaAplicada}</Badge>
                      </td>
                      <td className="mono">
                        {new Date(item.ultimaActualizacion).toLocaleString("es-PE")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="row-actions">
                          <Link href={`/inventory/${item.idInventorio}`}>
                            <Button variant="ghost">Stock mínimo</Button>
                          </Link>
                          <Button
                            variant="danger"
                            onClick={() => setItemAEliminar(item)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        abierto={Boolean(itemAEliminar)}
        titulo="Confirmar eliminación de inventario"
        mensaje={
          itemAEliminar
            ? `¿Eliminar el registro de "${itemAEliminar.nombreProducto}" en ${itemAEliminar.nombreAlmacen}? Solo se permite si la cantidad es 0.`
            : ""
        }
        onCancelar={() => setItemAEliminar(null)}
        onConfirmar={async () => {
          if (!itemAEliminar) return;
          const id = itemAEliminar.idInventorio;
          setItemAEliminar(null);
          await manejarEliminar(id);
        }}
      />
    </>
  );
}
