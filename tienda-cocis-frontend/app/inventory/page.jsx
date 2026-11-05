"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  obtenerInventario,
  crearInventario,
  eliminarInventario,
} from "../../services/inventoryService";
import { obtenerProductos } from "../../services/productService";
import InventoryForm from "../../components/inventoryForm";
import { Card, Badge, Button, Select, ConfirmModal } from "../../components/ui";

export default function InventoryPage() {
  const [inventario, setInventario] = useState([]);
  const [productos, setProductos] = useState([]);
  const [estrategia, setEstrategia] = useState("estandar");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [itemAEliminar, setItemAEliminar] = useState(null);

  const cargarDatos = async (estrategiaSeleccionada = estrategia) => {
    try {
      setCargando(true);
      setError("");
      const [listaInv, listaProd] = await Promise.all([
        obtenerInventario(estrategiaSeleccionada),
        obtenerProductos(),
      ]);
      setInventario(listaInv || []);
      setProductos(listaProd || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos(estrategia);
  }, [estrategia]);

  const manejarCrear = async (datos) => {
    try {
      setError("");
      await crearInventario(datos);
      await cargarDatos(estrategia);
    } catch (err) {
      setError(err.message);
    }
  };

  const manejarEliminar = async (idInventorio) => {
    try {
      setError("");
      await eliminarInventario(idInventorio);
      await cargarDatos(estrategia);
    } catch (err) {
      setError(err.message);
    }
  };

  const idsConInventario = new Set(inventario.map((i) => i.idProducto));
  const productosDisponibles = productos.filter(
    (p) => !idsConInventario.has(p.idProducto)
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Almacén (Inventario)</h1>
          <p className="page-subtitle">
            Tabla `almacen` con cálculo dinámico mediante el Patrón Strategy
          </p>
        </div>
        <div style={{ minWidth: "280px" }}>
          <Select
            id="selectorEstrategiaGlobal"
            label="Estrategia activa de visualización"
            value={estrategia}
            onChange={(e) => setEstrategia(e.target.value)}
          >
            <option value="estandar">Estrategia Estándar (100% valor)</option>
            <option value="liquidacion">Estrategia Liquidación (-30% precio)</option>
            <option value="volumen">Estrategia por Volumen (bonificación ≥20 uds)</option>
          </Select>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <Card
        title="Asignar Producto al Almacén"
        subtitle="Registra stock inicial aplicando la estrategia seleccionada"
      >
        {productosDisponibles.length === 0 ? (
          <p className="empty-state">
            Todos los productos registrados ya tienen una entrada en el almacén.{" "}
            <Link href="/products/create" style={{ textDecoration: "underline" }}>
              Crear nuevo producto
            </Link>
          </p>
        ) : (
          <InventoryForm
            productos={productosDisponibles}
            estrategiaActiva={estrategia}
            onSubmit={manejarCrear}
          />
        )}
      </Card>

      <Card
        title="Existencias en Almacén"
        subtitle={`Mostrando valoración bajo estrategia: ${estrategia.toUpperCase()}`}
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
                            <Button variant="ghost">Editar Stock</Button>
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
            ? `¿Estás seguro de que deseas eliminar del almacén el registro de "${itemAEliminar.nombreProducto}"?`
            : ""
        }
        onCancelar={() => setItemAEliminar(null)}
        onConfirmar={async () => {
          const id = itemAEliminar.idInventorio;
          setItemAEliminar(null);
          await manejarEliminar(id);
        }}
      />
    </>
  );
}
