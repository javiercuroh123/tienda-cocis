"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  obtenerProductos,
  actualizarProducto,
  eliminarProducto,
} from "../../services/productService";
import ProductTable from "../../components/productTable";
import { Card, Button } from "../../components/ui";

export default function ProductsPage() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarProductos = async () => {
    try {
      setCargando(true);
      setError("");
      const datos = await obtenerProductos();
      setProductos(datos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const manejarActualizar = async (idProducto, datos) => {
    try {
      setError("");
      await actualizarProducto(idProducto, datos);
      await cargarProductos();
    } catch (err) {
      setError(err.message);
    }
  };

  const manejarEliminar = async (idProducto) => {
    try {
      setError("");
      await eliminarProducto(idProducto);
      await cargarProductos();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Productos Peruanos</h1>
          <p className="page-subtitle">
            Artesanía, textilería andina y gastronomía regional en Soles Peruanos (S/)
          </p>
        </div>
        <Link href="/products/create">
          <Button variant="primary">+ Crear Producto</Button>
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <Card
        title="Catálogo de Productos"
        subtitle="Puedes editar directamente cualquier fila o eliminar un registro"
      >
        {cargando ? (
          <p className="empty-state">Cargando productos...</p>
        ) : (
          <ProductTable
            productos={productos}
            onActualizar={manejarActualizar}
            onEliminar={manejarEliminar}
          />
        )}
      </Card>
    </>
  );
}
