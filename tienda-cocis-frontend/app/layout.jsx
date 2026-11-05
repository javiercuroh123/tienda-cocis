import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "TiendaCocis Perú | Productos Peruanos y Almacén",
  description: "Gestión de productos tradicionales peruanos y almacén en Soles (S/)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-PE">
      <body>
        <header className="navbar">
          <div className="navbar-inner">
            <Link href="/" className="brand">
              <span className="brand-dot" style={{ background: "#b91c1c" }} />
              <span>TiendaCocis Perú</span>
            </Link>
            <nav className="nav-links">
              <Link href="/" className="nav-link">
                Inicio
              </Link>
              <Link href="/products" className="nav-link">
                Productos
              </Link>
              <Link href="/inventory" className="nav-link">
                Inventario (Almacén)
              </Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
