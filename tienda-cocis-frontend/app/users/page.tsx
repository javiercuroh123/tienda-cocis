"use client";

import CatalogPage from "../../components/catalogPage";
import { Icon } from "../../components/icons";
import { usuarioService } from "../../services/catalogService";
import type { Usuario } from "../../types";

export default function UsersPage() {
  return (
    <CatalogPage<Usuario>
      titulo="Usuarios"
      subtitulo="Responsables que se registran en cada movimiento de inventario"
      sustantivo={["usuario", "usuarios"]}
      icono="usuarios"
      avatar
      servicio={usuarioService}
      clave="idUsuario"
      vacio={{ idUsuario: "", nombre: "", correo: "" }}
      campos={[
        { nombre: "nombre", etiqueta: "Nombre", placeholder: "Ej. María Torres" },
        {
          nombre: "correo",
          etiqueta: "Correo",
          tipo: "email",
          placeholder: "nombre@tiendacocis.pe",
          formato: (u) => (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="correo" size={14} />
              {u.correo}
            </span>
          ),
        },
      ]}
    />
  );
}
