import type {
  InputHTMLAttributes,
  MouseEventHandler,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type VarianteBoton = "primary" | "ghost" | "danger";

interface ButtonProps {
  children: ReactNode;
  variant?: VarianteBoton;
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  onClick,
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, id, ...props }: InputProps) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className="input" {...props} />
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, id, children, ...props }: SelectProps) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <select id={id} className="input" {...props}>
        {children}
      </select>
    </div>
  );
}

type TonoBadge = "neutral" | "success" | "warning" | "danger";

interface BadgeProps {
  children: ReactNode;
  tone?: TonoBadge;
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, actions, children }: CardProps) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-header">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

interface ConfirmModalProps {
  abierto: boolean;
  titulo?: string;
  mensaje: ReactNode;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
  textoConfirmar?: string;
}

export function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  onConfirmar,
  onCancelar,
  textoConfirmar = "Sí, eliminar",
}: ConfirmModalProps) {
  if (!abierto) return null;

  return (
    <div className="modal-backdrop" onClick={onCancelar}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{titulo || "¿Estás seguro?"}</h3>
        <p className="modal-message">{mensaje}</p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onCancelar}>
            No, cancelar
          </Button>
          <Button variant="danger" onClick={() => void onConfirmar()}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MensajesProps {
  error?: string;
  exito?: string;
}

/** Muestra el error de validación/API o la confirmación de la última operación. */
export function Mensajes({ error, exito }: MensajesProps) {
  if (error) return <div className="alert" role="alert">{error}</div>;
  if (exito)
    return (
      <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        {exito}
      </div>
    );
  return null;
}
