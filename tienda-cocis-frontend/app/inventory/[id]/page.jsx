"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  obtenerInventarioPorId,
  actualizarStock,
} from "../../../services/inventoryService";
import InventoryForm from "../../../components/inventoryForm";
import { Card, Button, Badge } from "../../../components/ui";

export default function EditInventoryPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [registro, setRegistro] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDetalle() {
      try {
        setCargando(true);
        const datos = await obtenerInventarioPorId(id, "estandar");
        setRegistro(datos);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }
    cargarDetalle();
  }, [id]);

  const manejarActualizar = async (datos) => {
    try {
      setError("");
      await actualizarStock(id, datos);
      router.push("/inventory");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Registro de Almacén</h1>
          <p className="page-subtitle">
            Actualiza el stock aplicando una estrategia del Patrón Strategy
          </p>
        </div>
        <Link href="/inventory">
          <Button variant="ghost">← Volver al almacén</Button>
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      <Card
        title={
          registro
            ? `Producto: ${registro.nombreProducto} (${registro.idInventorio})`
            : "Cargando registro..."
        }
        actions={
          registro && (
            <Badge tone="neutral">
              Precio unitario: S/ {Number(registro.precioUnidad).toFixed(2)}
            </Badge>
          )
        }
      >
        {cargando ? (
          <p className="empty-state">Cargando datos...</p>
        ) : registro ? (
          <InventoryForm inicial={registro} onSubmit={manejarActualizar} />
        ) : (
          <p className="empty-state">No se encontró el registro solicitado.</p>
        )}
      </Card>
    </>
  );
}
