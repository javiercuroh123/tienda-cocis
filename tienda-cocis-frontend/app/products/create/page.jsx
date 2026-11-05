"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearProducto } from "../../../services/productService";
import { Card, Input, Button } from "../../../components/ui";

export default function CreateProductPage() {
  const router = useRouter();
  const [nombreProducto, setNombreProducto] = useState("");
  const [precioUnidad, setPrecioUnidad] = useState("");
  const [categoria, setCategoria] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const manejarSubmit = async (e) => {
    e.preventDefault();
    try {
      setEnviando(true);
      setError("");
      await crearProducto({
        nombreProducto,
        precioUnidad: parseFloat(precioUnidad),
        categoria,
      });
      router.push("/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar Nuevo Producto</h1>
          <p className="page-subtitle">
            Crea un nuevo registro en la tabla `productos`
          </p>
        </div>
        <Link href="/products">
          <Button variant="ghost">← Volver al listado</Button>
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <Card title="Datos del Producto Peruano">
        <form onSubmit={manejarSubmit} className="form-grid">
          <Input
            id="nombreProducto"
            label="Nombre del Producto (nombreProducto)"
            placeholder="Ej. Retablo Ayacuchano Tallado"
            value={nombreProducto}
            onChange={(e) => setNombreProducto(e.target.value)}
            required
          />
          <Input
            id="precioUnidad"
            label="Precio Unitario en Soles S/ (precioUnidad)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ej. 45.00"
            value={precioUnidad}
            onChange={(e) => setPrecioUnidad(e.target.value)}
            required
          />
          <Input
            id="categoria"
            label="Categoría Regional (categoria)"
            placeholder="Ej. Artesanía Peruana / Textilería Andina"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
          />
          <div>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Guardando..." : "Guardar Producto"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
