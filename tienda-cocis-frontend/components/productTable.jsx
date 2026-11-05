"use client";

import { useState } from "react";
import { Button, Badge, Input, ConfirmModal } from "./ui";

export default function ProductTable({ productos, onActualizar, onEliminar }) {
  const [editandoId, setEditandoId] = useState(null);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [formulario, setFormulario] = useState({
    nombreProducto: "",
    precioUnidad: "",
    categoria: "",
  });

  const iniciarEdicion = (producto) => {
    setEditandoId(producto.idProducto);
    setFormulario({
      nombreProducto: producto.nombreProducto,
      precioUnidad: producto.precioUnidad,
      categoria: producto.categoria,
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
  };

  const guardarEdicion = async (idProducto) => {
    await onActualizar(idProducto, {
      nombreProducto: formulario.nombreProducto,
      precioUnidad: parseFloat(formulario.precioUnidad),
      categoria: formulario.categoria,
    });
    setEditandoId(null);
  };

  if (!productos || productos.length === 0) {
    return <p className="empty-state">No hay productos registrados todavía.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>ID (idProducto)</th>
            <th>Producto Peruano (nombreProducto)</th>
            <th>Categoría Regional (categoria)</th>
            <th>Precio en Soles (precioUnidad)</th>
            <th style={{ textAlign: "right" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => {
            const enEdicion = editandoId === prod.idProducto;
            return (
              <tr key={prod.idProducto}>
                <td className="mono">{prod.idProducto}</td>
                <td>
                  {enEdicion ? (
                    <Input
                      value={formulario.nombreProducto}
                      onChange={(e) =>
                        setFormulario({ ...formulario, nombreProducto: e.target.value })
                      }
                    />
                  ) : (
                    <strong>{prod.nombreProducto}</strong>
                  )}
                </td>
                <td>
                  {enEdicion ? (
                    <Input
                      value={formulario.categoria}
                      onChange={(e) =>
                        setFormulario({ ...formulario, categoria: e.target.value })
                      }
                    />
                  ) : (
                    <Badge>{prod.categoria}</Badge>
                  )}
                </td>
                <td className="mono">
                  {enEdicion ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formulario.precioUnidad}
                      onChange={(e) =>
                        setFormulario({ ...formulario, precioUnidad: e.target.value })
                      }
                    />
                  ) : (
                    `S/ ${Number(prod.precioUnidad).toFixed(2)}`
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="row-actions">
                    {enEdicion ? (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => guardarEdicion(prod.idProducto)}
                        >
                          Guardar
                        </Button>
                        <Button variant="ghost" onClick={cancelarEdicion}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => iniciarEdicion(prod)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setProductoAEliminar(prod)}
                        >
                          Eliminar
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ConfirmModal
        abierto={Boolean(productoAEliminar)}
        titulo="Confirmar eliminación de producto"
        mensaje={
          productoAEliminar
            ? `¿Estás seguro de que deseas eliminar "${productoAEliminar.nombreProducto}"? Esta acción no se puede deshacer.`
            : ""
        }
        onCancelar={() => setProductoAEliminar(null)}
        onConfirmar={async () => {
          const id = productoAEliminar.idProducto;
          setProductoAEliminar(null);
          await onEliminar(id);
        }}
      />
    </div>
  );
}
