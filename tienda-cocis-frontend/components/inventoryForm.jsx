"use client";

import { useState } from "react";
import { Button, Input, Select } from "./ui";

export default function InventoryForm({
  productos = [],
  inicial = null,
  estrategiaActiva = "estandar",
  onSubmit,
}) {
  const [idProducto, setIdProducto] = useState(inicial?.idProducto || "");
  const [stock, setStock] = useState(inicial?.stock ?? 10);
  const [stockMin, setStockMin] = useState(inicial?.stockMin ?? 5);
  const [estrategia, setEstrategia] = useState(
    inicial?.estrategiaAplicada || estrategiaActiva || "estandar"
  );
  const [enviando, setEnviando] = useState(false);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      await onSubmit({
        idProducto,
        stock: parseInt(stock, 10),
        stockMin: parseInt(stockMin, 10),
        estrategia,
      });
      if (!inicial) {
        setIdProducto("");
        setStock(10);
        setStockMin(5);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={manejarEnvio} className="form-grid">
      {!inicial && (
        <Select
          id="idProducto"
          label="Producto (idProducto)"
          value={idProducto}
          onChange={(e) => setIdProducto(e.target.value)}
          required
        >
          <option value="">Seleccione un producto...</option>
          {productos.map((p) => (
            <option key={p.idProducto} value={p.idProducto}>
              {p.nombreProducto} (S/ {Number(p.precioUnidad).toFixed(2)})
            </option>
          ))}
        </Select>
      )}

      <Input
        id="stock"
        label="Stock actual (stock)"
        type="number"
        min="0"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        required
      />

      <Input
        id="stockMin"
        label="Stock mínimo alerta (stockMin)"
        type="number"
        min="0"
        value={stockMin}
        onChange={(e) => setStockMin(e.target.value)}
        required
      />

      <Select
        id="estrategia"
        label="Estrategia (Patrón Strategy)"
        value={estrategia}
        onChange={(e) => setEstrategia(e.target.value)}
      >
        <option value="estandar">Estrategia Estándar (Valor real)</option>
        <option value="liquidacion">Estrategia de Liquidación (-30% depreciación)</option>
        <option value="volumen">Estrategia por Volumen (+10% bonificación ≥20 uds)</option>
      </Select>

      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={enviando}>
          {enviando
            ? "Procesando..."
            : inicial
            ? "Actualizar Almacén"
            : "Registrar en Almacén"}
        </Button>
      </div>
    </form>
  );
}
