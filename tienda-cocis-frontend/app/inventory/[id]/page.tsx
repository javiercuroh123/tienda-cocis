"use client";

import { use } from "react";
import InventoryView from "../../../components/inventoryView";

interface EditInventoryPageProps {
  params: Promise<{ id: string }>;
}

/** Ruta directa a un registro: muestra el inventario con el modal de edición abierto. */
export default function EditInventoryPage({ params }: EditInventoryPageProps) {
  const { id } = use(params);
  return <InventoryView editarId={id} />;
}
