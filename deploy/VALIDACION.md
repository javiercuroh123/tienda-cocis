# Validación del despliegue

Comprobaciones realizadas localmente el 9 de noviembre de 2026:

- `go test ./...`: correcto.
- Compilación de Next.js 15.5.29 para producción: correcta.
- Construcción del contenedor del frontend con PostCSS 8.5.32: correcta.
- Auditoría de npm después de la actualización: cero vulnerabilidades conocidas.
- Validación de Compose y del Caddyfile: correcta.
- PostgreSQL, backend y frontend saludables en Docker.
- Interfaz y API devuelven 401 sin autenticación.
- Páginas, JavaScript y CSS accesibles a través de Caddy con autenticación.
- Creación, consulta y actualización de productos e inventario correctas.
- Estrategias de volumen y liquidación comprobadas por HTTP.
- Datos conservados al recrear los cuatro contenedores.
- Eliminación correcta de los registros creados exclusivamente para la prueba.

## Alcance y comprobaciones pendientes

La descarga inicial del compilador de Go no terminó en el entorno local.
La primera prueba local utilizó un binario compilado para Linux con Go 1.27.3.
Posteriormente, la construcción completa del Dockerfile de varias etapas del
backend se completó correctamente en la instancia EC2.

Se creó la instancia `i-006d25ec59f9badd2` en Ohio (`us-east-2`) con autorización
del usuario. Se comprobó SSH usando la clave local importada y se abrió el
túnel local hacia el proxy. La emisión de un certificado HTTPS público queda
comprobada usando el nombre público de sslip.io. Véase `EC2_ACTUAL.md` para los datos de acceso.

## Prueba final en AWS

Los cuatro servicios arrancaron en EC2. PostgreSQL, Go y Next.js superaron
sus comprobaciones de salud. A través del túnel SSH se verificaron el rechazo
de acceso sin contraseña, las páginas de la aplicación, los datos iniciales,
la creación y actualización de productos e inventario, las estrategias de
volumen y liquidación y la eliminación de los registros de prueba.

Posteriormente se publicó `https://tienda-cocis.18-189-6-193.sslip.io` con
autorización del usuario. Se verificaron la resolución DNS a `18.189.6.193`,
la redirección HTTP 308 a HTTPS, el certificado TLS sin omitir validaciones,
el rechazo 401 sin credenciales y la misma prueba funcional de páginas,
productos e inventario mediante la URL pública. SSH conserva su origen /32.
