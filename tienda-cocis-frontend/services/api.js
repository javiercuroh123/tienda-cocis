const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export async function peticionApi(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: {
      "Content-Type": "application/json",
      ...(opciones.headers || {}),
    },
    cache: "no-store",
    ...opciones,
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(datos?.error || `Error HTTP ${respuesta.status}`);
  }

  return datos;
}
