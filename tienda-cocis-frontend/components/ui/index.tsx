"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type MouseEventHandler,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Icon, type NombreIcono } from "../icons";
import { estadoStock, iniciales } from "../../lib/format";

// ---------- Botones ----------

/** "ghost" se conserva por compatibilidad: es el botón con borde (Secundario en Figma). */
type VarianteBoton = "primary" | "secondary" | "ghost" | "subtle" | "danger";

interface ButtonProps {
  children: ReactNode;
  variant?: VarianteBoton;
  size?: "md" | "sm";
  icon?: NombreIcono;
  block?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  title?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  block,
  type = "button",
  onClick,
  disabled,
  title,
}: ButtonProps) {
  const v = variant === "ghost" ? "secondary" : variant;
  const clases = ["btn", `btn-${v}`, size === "sm" && "btn-sm", block && "btn-block"].filter(Boolean).join(" ");
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={clases} title={title}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

interface IconButtonProps {
  icon: NombreIcono;
  label: string;
  tone?: "default" | "danger" | "outline";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit";
}

export function IconButton({ icon, label, tone = "default", onClick, disabled, type = "button" }: IconButtonProps) {
  const clase = tone === "danger" ? "icon-btn icon-btn-danger" : tone === "outline" ? "icon-btn icon-btn-outline" : "icon-btn";
  return (
    <button type={type} className={clase} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon name={icon} size={16} />
    </button>
  );
}

// ---------- Insignias, avatar ----------

export type TonoBadge = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export function Badge({ children, tone = "neutral", dot = false }: { children: ReactNode; tone?: TonoBadge; dot?: boolean }) {
  return <span className={`badge badge-${tone}${dot ? " badge-dot" : ""}`}>{children}</span>;
}

export function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {iniciales(nombre)}
    </span>
  );
}

// ---------- Estructura de página ----------

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Sin relleno interior: para tablas, barras de filtros y pestañas. */
  flush?: boolean;
}

export function Card({ title, subtitle, actions, children, flush }: CardProps) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="page-actions">{actions}</div>}
        </header>
      )}
      {flush ? children : <div className="card-body">{children}</div>}
    </section>
  );
}

// ---------- Campos ----------

interface CampoBase {
  label?: string;
  help?: ReactNode;
  error?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, CampoBase {
  icon?: NombreIcono;
}

export function Input({ label, help, error, icon, id, className, ...props }: InputProps) {
  const clases = ["input", icon && "input-con-icono", error && "input-error", className].filter(Boolean).join(" ");
  return (
    <div className="field">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="input-wrap">
        {icon && (
          <span className="input-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
        <input id={id} className={clases} aria-invalid={Boolean(error) || undefined} {...props} />
      </div>
      {(error || help) && <p className={`field-help${error ? " error" : ""}`}>{error || help}</p>}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, CampoBase {}

export function Select({ label, help, error, id, children, className, ...props }: SelectProps) {
  return (
    <div className="field">
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <select id={id} className={["input", error && "input-error", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </select>
      {(error || help) && <p className={`field-help${error ? " error" : ""}`}>{error || help}</p>}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  options: { value: T; label: string; icon?: NombreIcono }[];
  value: T;
  onChange: (valor: T) => void;
  block?: boolean;
  label?: string;
}

export function Segmented<T extends string>({ options, value, onChange, block, label }: SegmentedProps<T>) {
  return (
    <div className={`seg${block ? " seg-block" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={`seg-item${o.value === value ? " active" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <Icon name={o.icon} size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Indicadores ----------

interface StatCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: NombreIcono;
  alert?: boolean;
  loading?: boolean;
}

export function StatCard({ label, value, detail, icon, alert, loading }: StatCardProps) {
  return (
    <div className={`kpi${alert ? " alerta" : ""}`}>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-chip">
          <Icon name={icon} size={16} />
        </span>
      </div>
      {loading ? <div className="skeleton" style={{ height: 30, width: "60%" }} /> : <div className="kpi-value">{value}</div>}
      {detail && <div className="kpi-detail">{detail}</div>}
    </div>
  );
}

/** Stock actual frente al mínimo: la barra se llena al triple del mínimo. */
export function StockBar({ stock, stockMin }: { stock: number; stockMin: number }) {
  const estado = estadoStock(stock, stockMin);
  const ancho = Math.max(4, Math.min(100, (stock / Math.max(1, stockMin * 3)) * 100));
  return (
    <span className={`stockbar ${estado}`} title={`Stock ${stock} · mínimo ${stockMin}`}>
      <span className="stockbar-track">
        <span className="stockbar-fill" style={{ width: `${ancho}%`, display: "block" }} />
      </span>
      <span className="stockbar-valor">{stock}</span>
    </span>
  );
}

// ---------- Estados ----------

interface EmptyStateProps {
  icon?: NombreIcono;
  title: string;
  description?: ReactNode;
  ok?: boolean;
  action?: ReactNode;
}

export function EmptyState({ icon = "paquete", title, description, ok, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className={`empty-icon${ok ? " ok" : ""}`}>
        <Icon name={ok ? "check" : icon} size={24} />
      </span>
      <p className="empty-title">{title}</p>
      {description && <p className="empty-desc">{description}</p>}
      {action}
    </div>
  );
}

/** Esqueleto con forma de tabla mientras responde la API. */
export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: 16, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--borde)" }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div className="skeleton" style={{ height: 12, width: `${70 - (i % 3) * 12}%` }} />
            <div className="skeleton" style={{ height: 10, width: 90 }} />
          </div>
          {Array.from({ length: cols - 1 }, (_, j) => (
            <div key={j} className="skeleton" style={{ height: 12, width: j === 0 ? 110 : 64 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

type TonoAlerta = "danger" | "warning" | "info" | "success";
const ICONO_ALERTA: Record<TonoAlerta, NombreIcono> = { danger: "error", warning: "alerta", info: "info", success: "check" };

export function Alert({ tone = "info", title, children }: { tone?: TonoAlerta; title?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={ICONO_ALERTA[tone]} size={20} />
      <div>
        {title && <p className="alert-title">{title}</p>}
        {children && <div className="alert-desc">{children}</div>}
      </div>
    </div>
  );
}

/** Muestra el error de validación/API. Las confirmaciones ahora usan toasts (useToast). */
export function Mensajes({ error, exito }: { error?: string; exito?: string }) {
  if (error) return <Alert tone="danger" title="No se pudo completar la operación">{error}</Alert>;
  if (exito) return <Alert tone="success" title={exito} />;
  return null;
}

// ---------- Paginación ----------

export function usePaginacion<T>(lista: T[], porPagina = 10) {
  const [pagina, setPagina] = useState(1);
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  useEffect(() => {
    if (pagina > paginas) setPagina(paginas);
  }, [pagina, paginas]);
  const visibles = useMemo(() => lista.slice((pagina - 1) * porPagina, pagina * porPagina), [lista, pagina, porPagina]);
  return { visibles, pagina, paginas, total, porPagina, setPagina };
}

interface PaginationProps {
  pagina: number;
  paginas: number;
  total: number;
  porPagina: number;
  setPagina: (p: number) => void;
  sustantivo: string;
}

export function Pagination({ pagina, paginas, total, porPagina, setPagina, sustantivo }: PaginationProps) {
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);
  return (
    <div className="pagination">
      <span style={{ flex: 1 }}>
        Mostrando {desde}–{hasta} de {total} {sustantivo}
      </span>
      <Button variant="secondary" size="sm" icon="chevron-izquierda" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
        Anterior
      </Button>
      <Button variant="secondary" size="sm" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>
        Siguiente
        <Icon name="chevron-derecha" size={16} />
      </Button>
    </div>
  );
}

// ---------- Superposiciones ----------

function useTeclaEscape(activo: boolean, alPresionar: () => void) {
  const ref = useRef(alPresionar);
  ref.current = alPresionar;
  useEffect(() => {
    if (!activo) return;
    const manejar = (e: KeyboardEvent) => e.key === "Escape" && ref.current();
    document.addEventListener("keydown", manejar);
    return () => document.removeEventListener("keydown", manejar);
  }, [activo]);
}

interface ConfirmModalProps {
  abierto: boolean;
  titulo?: string;
  mensaje: ReactNode;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
  textoConfirmar?: string;
  textoCancelar?: string;
}

export function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  onConfirmar,
  onCancelar,
  textoConfirmar = "Sí, eliminar",
  textoCancelar = "No, cancelar",
}: ConfirmModalProps) {
  useTeclaEscape(abierto, onCancelar);
  if (!abierto) return null;
  return (
    <div className="overlay" onClick={onCancelar}>
      <div className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-titulo" onClick={(e) => e.stopPropagation()}>
        <span className="confirm-icon">
          <Icon name="alerta" size={20} />
        </span>
        <div>
          <h3 id="confirm-titulo" className="confirm-title">
            {titulo || "¿Estás seguro?"}
          </h3>
          <p className="confirm-message">{mensaje}</p>
        </div>
        <div className="page-actions" style={{ justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancelar}>
            {textoCancelar}
          </Button>
          <Button variant="danger" onClick={() => void onConfirmar()}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PanelProps {
  abierto: boolean;
  titulo: string;
  subtitulo?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Si se indica, el panel es un formulario y el pie puede llevar un botón type="submit". */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
}

export function Modal({ abierto, titulo, subtitulo, onCerrar, children, footer, onSubmit, ancho = 520 }: PanelProps & { ancho?: number }) {
  useTeclaEscape(abierto, onCerrar);
  if (!abierto) return null;
  const contenido = (
    <>
      <div className="modal-header">
        <div style={{ flex: 1 }}>
          <h2 className="modal-title">{titulo}</h2>
          {subtitulo && <p className="modal-subtitle">{subtitulo}</p>}
        </div>
        <IconButton icon="cerrar" label="Cerrar" onClick={onCerrar} />
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </>
  );
  return (
    <div className="overlay" onClick={onCerrar}>
      {onSubmit ? (
        <form className="modal" style={{ maxWidth: ancho }} role="dialog" aria-modal="true" aria-label={titulo} onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
          {contenido}
        </form>
      ) : (
        <div className="modal" style={{ maxWidth: ancho }} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
          {contenido}
        </div>
      )}
    </div>
  );
}

export function Drawer({ abierto, titulo, subtitulo, onCerrar, children, footer, onSubmit }: PanelProps) {
  useTeclaEscape(abierto, onCerrar);
  if (!abierto) return null;
  const contenido = (
    <>
      <div className="drawer-header">
        <div style={{ flex: 1 }}>
          <h2 className="modal-title">{titulo}</h2>
          {subtitulo && <p className="modal-subtitle">{subtitulo}</p>}
        </div>
        <IconButton icon="cerrar" label="Cerrar" onClick={onCerrar} />
      </div>
      <div className="drawer-body">{children}</div>
      {footer && <div className="drawer-footer">{footer}</div>}
    </>
  );
  return (
    <>
      <div className="drawer-overlay" onClick={onCerrar} />
      {onSubmit ? (
        <form className="drawer" role="dialog" aria-modal="true" aria-label={titulo} onSubmit={onSubmit}>
          {contenido}
        </form>
      ) : (
        <aside className="drawer" role="dialog" aria-modal="true" aria-label={titulo}>
          {contenido}
        </aside>
      )}
    </>
  );
}

// ---------- Toasts ----------

interface Toast {
  id: number;
  titulo: string;
  descripcion?: string;
}

const ContextoToast = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const cerrar = useCallback((id: number) => setToasts((l) => l.filter((t) => t.id !== id)), []);
  const mostrar = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((l) => [...l.slice(-2), { ...t, id }]);
      setTimeout(() => cerrar(id), 4000);
    },
    [cerrar]
  );
  return (
    <ContextoToast.Provider value={mostrar}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" role="status">
            <span style={{ color: "var(--exito)", marginTop: 1 }}>
              <Icon name="check" size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>{t.titulo}</p>
              {t.descripcion && <p className="toast-desc">{t.descripcion}</p>}
            </div>
            <IconButton icon="cerrar" label="Cerrar aviso" onClick={() => cerrar(t.id)} />
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToast() {
  return useContext(ContextoToast);
}
