import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TiendaCocis Perú | Productos Peruanos y Almacén",
  description: "Gestión de productos tradicionales peruanos y almacén en Soles (S/)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-PE">
      <body>
        <header className="navbar">
          <div className="navbar-inner flex-wrap gap-3">
            <Link href="/" className="brand">
              <span className="brand-dot" style={{ background: "#b91c1c" }} />
              <span>TiendaCocis Perú</span>
            </Link>
            <nav className="nav-links flex-wrap">
              {[
                ["/", "Inicio"],
                ["/products", "Productos"],
                ["/inventory", "Inventario"],
                ["/movements", "Movimientos"],
                ["/deliveries", "Entregas"],
                ["/warehouses", "Almacenes"],
                ["/suppliers", "Proveedores"],
                ["/transports", "Transportes"],
                ["/users", "Usuarios"],
              ].map(([ruta, texto]) => (
                <Link key={ruta} href={ruta} className="nav-link">
                  {texto}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
