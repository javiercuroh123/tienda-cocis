/** S/ 2,319.00 */
export function soles(valor: number | undefined | null): string {
  const n = Number(valor) || 0;
  return `S/ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 19 nov 2026, 14:30 */
export function fechaHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleString("es-PE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .replace(".", "");
}

/** 19 nov */
export function diaCorto(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short" }).replace(".", "");
}

export function hora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

/** "2026-11-19" (fecha sin hora del backend) → "19 nov 2026" sin desfase de zona horaria. */
export function fechaSimple(aaaaMmDd: string): string {
  const [a, m, d] = aaaaMmDd.split("-").map(Number);
  if (!a || !m || !d) return aaaaMmDd;
  return new Date(a, m - 1, d)
    .toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })
    .replace(".", "");
}

/** "hace 25 min", "hace 3 h", "ayer", "12 nov" */
export function haceCuanto(iso: string): string {
  const d = new Date(iso);
  const minutos = Math.round((Date.now() - d.getTime()) / 60000);
  if (Number.isNaN(minutos)) return "";
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  if (horas < 48) return "ayer";
  return diaCorto(iso);
}

export function iniciales(nombre: string): string {
  const partes = nombre
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p));
  const letras = (partes.length ? partes : [nombre]).slice(0, 2).map((p) => p[0] || "");
  return letras.join("").toUpperCase() || "?";
}

export type EstadoStock = "optimo" | "bajo" | "sin-stock";

export function estadoStock(stock: number, stockMin: number): EstadoStock {
  if (stock <= 0) return "sin-stock";
  return stock <= stockMin ? "bajo" : "optimo";
}

/** Genera y descarga un CSV (separador ";" para que Excel en español lo abra en columnas). */
export function descargarCSV(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]) {
  const celda = (v: string | number) => {
    const texto = String(v ?? "");
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = [encabezados, ...filas].map((f) => f.map(celda).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
