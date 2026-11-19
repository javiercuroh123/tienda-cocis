"use client";

import { useState, type FormEvent } from "react";
import { Button, Input } from "./ui";
import type { Inventario, InventarioEntrada } from "../types";

interface InventoryFormProps {
  inicial: Inventario;
  onSubmit: (datos: InventarioEntrada) => Promise<void>;
}

/** Edita el stock mínimo. La cantidad solo cambia con entradas, salidas o transferencias. */
export default function InventoryForm({ inicial, onSubmit }: InventoryFormProps) {
  const [stockMin, setStockMin] = useState<string>(String(inicial.stockMin));
  const [enviando, setEnviando] = useState(false);

  const manejarEnvio = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await onSubmit({ stockMin: parseInt(stockMin, 10), estrategia: "estandar" });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={manejarEnvio} className="form-grid">
      <Input id="stock" label="Cantidad actual (se modifica en Movimientos)" value={inicial.stock} disabled />
      <Input
        id="stockMin"
        label="Stock mínimo de alerta (stockMin)"
        type="number"
        min="0"
        value={stockMin}
        onChange={(e) => setStockMin(e.target.value)}
        required
      />
      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar stock mínimo"}
        </Button>
      </div>
    </form>
  );
}
