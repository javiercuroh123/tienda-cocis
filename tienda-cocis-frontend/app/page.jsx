"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerProductos } from "../services/productService";
import { obtenerInventario } from "../services/inventoryService";
import { Card, Badge, Button } from "../components/ui";

export default function DashboardPage() {
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarResumen() {
      try {
        setCargando(true);
        const [listaProd, listaInv] = await Promise.all([
          obtenerProductos(),
          obtenerInventario("estandar"),
        ]);
        setProductos(listaProd || []);
        setInventario(listaInv || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }
    cargarResumen();
  }, []);

  const alertasBajoStock = inventario.filter((i) => i.stock <= i.stockMin);
  const valorTotalAlmacen = inventario.reduce(
    (acc, item) => acc + (Number(item.valorCalculado) || 0),
    0
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel Principal — TiendaCocis Perú</h1>
          <p className="page-subtitle">
            Productos Tradicionales Peruanos · Moneda en Soles (S/) · Arquitectura Hexagonal y Patrones
          </p>
        </div>
        <div className="row-actions">
          <Link href="/products/create">
            <Button variant="primary">+ Nuevo Producto Peruano</Button>
          </Link>
          <Link href="/inventory">
            <Button variant="ghost">Gestionar Almacén</Button>
          </Link>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Productos Registrados</div>
          <div className="stat-value">{cargando ? "..." : productos.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Registros en Almacén</div>
          <div className="stat-value">{cargando ? "..." : inventario.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alertas Stock Mínimo</div>
          <div className="stat-value">{cargando ? "..." : alertasBajoStock.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Valor Total Almacén (S/)</div>
          <div className="stat-value">
            {cargando ? "..." : `S/ ${valorTotalAlmacen.toFixed(2)}`}
          </div>
        </div>
      </div>

      <Card
        title="Alertas de Stock en Almacén"
        subtitle="Productos cuyo stock actual es menor o igual al stockMin configurado"
      >
        {cargando ? (
          <p className="empty-state">Cargando estado del almacén...</p>
        ) : alertasBajoStock.length === 0 ? (
          <p className="empty-state">Todo el inventario se encuentra por encima del stock mínimo.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID Inventario</th>
                  <th>Producto</th>
                  <th>Stock Actual</th>
                  <th>Stock Mínimo</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {alertasBajoStock.map((item) => (
                  <tr key={item.idInventorio}>
                    <td className="mono">{item.idInventorio}</td>
                    <td>
                      <strong>{item.nombreProducto}</strong>
                    </td>
                    <td className="mono">{item.stock}</td>
                    <td className="mono">{item.stockMin}</td>
                    <td>
                      <Badge tone="danger">Reponer Stock</Badge>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/inventory/${item.idInventorio}`}>
                        <Button variant="ghost">Actualizar</Button>
                      </Link>
                    </td>
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
