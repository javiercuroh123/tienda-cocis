export function Button({ children, variant = "primary", type = "button", onClick, disabled }) {
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

export function Input({ label, id, ...props }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <input id={id} className="input" {...props} />
    </div>
  );
}

export function Select({ label, id, children, ...props }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      <select id={id} className="input" {...props}>
        {children}
      </select>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Card({ title, subtitle, actions, children }) {
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

export function ConfirmModal({ abierto, titulo, mensaje, onConfirmar, onCancelar }) {
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
          <Button variant="danger" onClick={onConfirmar}>
            Sí, eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}

