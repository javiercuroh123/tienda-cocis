package domain

// TipoError clasifica los errores de negocio para que el adaptador HTTP elija el código.
type TipoError int

const (
	ErrorValidacion TipoError = iota
	ErrorNoEncontrado
	ErrorConflicto
)

// ErrorNegocio transporta un mensaje legible para la interfaz y su clasificación.
type ErrorNegocio struct {
	Tipo    TipoError
	Mensaje string
}

func (e *ErrorNegocio) Error() string { return e.Mensaje }

func Invalido(mensaje string) error     { return &ErrorNegocio{ErrorValidacion, mensaje} }
func NoEncontrado(mensaje string) error { return &ErrorNegocio{ErrorNoEncontrado, mensaje} }
func Conflicto(mensaje string) error    { return &ErrorNegocio{ErrorConflicto, mensaje} }
