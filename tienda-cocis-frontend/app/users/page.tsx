"use client";

import CatalogPage from "../../components/catalogPage";
import { usuarioService } from "../../services/catalogService";

export default function UsersPage() {
  return (
    <CatalogPage
      titulo="Usuarios"
      subtitulo="Responsables que se registran en cada movimiento de inventario"
      servicio={usuarioService}
      clave="idUsuario"
      vacio={{ idUsuario: "", nombre: "", correo: "" }}
      campos={[
        { nombre: "nombre", etiqueta: "Nombre" },
        { nombre: "correo", etiqueta: "Correo", tipo: "email" },
      ]}
    />
  );
}
