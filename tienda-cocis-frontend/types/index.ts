// Tipos compartidos del frontend. Reflejan los structs del backend en Go
// (tienda-cocis-backend/internal/domain).

export type Estrategia = "estandar" | "liquidacion" | "volumen";

/** domain.Product */
export interface Producto {
  idProducto: string;
  nombreProducto: string;
  precioUnidad: number;
  categoria: string;
}

/** Cuerpo para crear/actualizar un producto (el backend genera el id). */
export type ProductoEntrada = Omit<Producto, "idProducto">;

/** domain.Inventory */
export interface Inventario {
  idInventorio: string;
  idProducto: string;
  nombreProducto?: string;
  precioUnidad?: number;
  idAlmacen: string;
  nombreAlmacen?: string;
  stock: number;
  stockMin: number;
  /** Fecha en formato ISO 8601 (time.Time de Go). */
  ultimaActualizacion: string;
  estrategiaAplicada?: Estrategia;
  valorCalculado?: number;
}

/** solicitudInventario (inventoryHandler.go): la cantidad cambia solo con movimientos. */
export interface InventarioEntrada {
  stockMin: number;
  estrategia: Estrategia;
}

// ---- Módulo logístico ----

export interface Usuario {
  idUsuario: string;
  nombre: string;
  correo: string;
}

export interface Proveedor {
  idProveedor: string;
  nombre: string;
  telefono: string;
  /** idProducto asociados (producto_proveedor). */
  productos: string[];
}

export interface Almacen {
  idAlmacen: string;
  nombre: string;
  direccion: string;
}

export type TipoTransporte = "camion" | "furgoneta" | "moto";

export interface Transporte {
  idTransporte: string;
  placa: string;
  conductor: string;
  tipo: TipoTransporte;
}

export type TipoMovimiento = "entrada" | "salida" | "transferencia";

export interface Movimiento {
  idMovimiento: string;
  idProducto: string;
  nombreProducto?: string;
  idAlmacen: string;
  nombreAlmacen?: string;
  idUsuario: string;
  nombreUsuario?: string;
  tipo: "entrada" | "salida";
  cantidad: number;
  fechaHora: string;
  idTransferencia: string | null;
}

/** domain.SolicitudMovimiento */
export interface MovimientoEntrada {
  tipo: TipoMovimiento;
  idProducto: string;
  idAlmacen: string;
  idAlmacenDestino?: string;
  idUsuario: string;
  cantidad: number;
  estrategia?: Estrategia;
}

export type EstadoEntrega = "pendiente" | "asignada" | "en_transito" | "entregada" | "cancelada";

export interface DetalleEntrega {
  idProducto: string;
  nombreProducto?: string;
  cantidad: number;
}

export interface Entrega {
  idEntrega: string;
  idTransporte: string | null;
  placa?: string;
  destinatario: string;
  direccion: string;
  /** AAAA-MM-DD */
  fecha: string;
  estado: EstadoEntrega;
  /** Estados a los que puede pasar (calculado por el backend). */
  siguientes: EstadoEntrega[];
  detalles: DetalleEntrega[];
}

export type EntregaEntrada = Pick<Entrega, "destinatario" | "direccion" | "fecha" | "detalles">;
