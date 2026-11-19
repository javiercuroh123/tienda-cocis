"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  obtenerInventarioPorId,
  actualizarStockMinimo,
} from "../../../services/inventoryService";
import InventoryForm from "../../../components/inventoryForm";
import { Card, Button, Badge } from "../../../components/ui";
import { mensajeDeError } from "../../../services/api";
import type { Inventario, InventarioEntrada } from "../../../types";

interface EditInventoryPageProps {
  params: Promise<{ id: string }>;
}

export default function EditInventoryPage({ params }: EditInventoryPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [registro, setRegistro] = useState<Inventario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarDetalle() {
      try {
        setCargando(true);
        const datos = await obtenerInventarioPorId(id, "estandar");
        setRegistro(datos);
      } catch (err) {
        setError(mensajeDeError(err));
      } finally {
        setCargando(false);
      }
    }
    cargarDetalle();
  }, [id]);

  const manejarActualizar = async (datos: InventarioEntrada) => {
    try {
      setError("");
      await actualizarStockMinimo(id, datos);
      router.push("/inventory");
    } catch (err) {
      setError(mensajeDeError(err));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Registro de Almacén</h1>
          <p className="page-subtitle">
            Ajusta el stock mínimo; las cantidades se registran en Movimientos
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
            ? `${registro.nombreProducto} · ${registro.nombreAlmacen} (${registro.idInventorio})`
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
