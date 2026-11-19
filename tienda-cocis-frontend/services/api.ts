const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

interface ErrorApi {
  error?: string;
}

export async function peticionApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: {
      "Content-Type": "application/json",
      ...(opciones.headers || {}),
    },
    cache: "no-store",
    ...opciones,
  });

  const datos: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error((datos as ErrorApi | null)?.error || `Error HTTP ${respuesta.status}`);
  }

  return datos as T;
}

/** Devuelve el mensaje de un error capturado en un catch (que es de tipo unknown). */
export function mensajeDeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
