# Despliegue de TiendaCocis en Amazon EC2

Esta guía despliega Next.js, Go, PostgreSQL y Caddy en una sola instancia EC2.
La primera configuración funciona sin dominio: el navegador accede mediante un
túnel SSH cifrado. Solo SSH queda accesible desde tu IP. Más adelante puedes
usar un dominio con HTTPS automático.

El archivo `compose.ec2.yaml` es independiente del `docker-compose.yml` de
desarrollo. No combines ambos con múltiples opciones `-f`: el archivo local
publica el puerto de PostgreSQL. La base de EC2 empieza con los datos de
`init.sql`; no copia los registros de tu computadora.

El frontend conserva Next.js 15. Se fija PostCSS 8.5.32 mediante `overrides`
para corregir los avisos de seguridad de la dependencia transitiva incluida
por Next.js. Mantén `package-lock.json` al subir o reconstruir el proyecto.

## 1. Crear la instancia

En la consola de AWS, abre EC2 y selecciona **Lanzar instancia**:

| Campo | Valor propuesto para la exposición |
|---|---|
| Región | Norte de Virginia, `us-east-1`, si no tienes una preferencia |
| Nombre | `tienda-cocis-seminario` |
| Imagen | Ubuntu Server 24.04 LTS, oficial de Canonical, x86_64 |
| Tipo | `t3.medium`, 2 vCPU y 4 GiB, para compilar y ejecutar los servicios |
| Disco | 20 GiB gp3, cifrado |
| Par de claves | Crear `tienda-cocis`, formato `.pem`; conservarlo solo en tu PC |
| Red | VPC predeterminada y subred con acceso a Internet |
| IPv4 pública | Habilitada |
| Entrada del grupo de seguridad | Solo TCP 22 desde **Mi IP**, prefijo `/32` |
| Metadatos avanzados | IMDSv2 obligatorio |

La subred necesita una ruta hacia un Internet Gateway para descargar imágenes
y paquetes. Si tu cuenta no tiene VPC predeterminada, configura primero una
VPC con una subred pública. No hace falta un NAT Gateway para esta propuesta.

Revisa el precio en tu cuenta antes de pulsar **Lanzar instancia**. Se cobran
EC2, almacenamiento EBS, IPv4 pública y, según el uso, transferencia y créditos
de CPU T3. No se presupone gratuidad. Para una demo puedes seleccionar créditos
de CPU **Standard** para evitar cargos por créditos excedentes; al agotarse,
el rendimiento puede bajar. Detén la instancia al terminar de usarla; EBS
continúa generando cargos. Eliminarla puede borrar su disco: respalda primero.

Espera a que los controles de estado estén correctos y anota la IPv4 pública.
No compartas el contenido del archivo `.pem`, contraseñas ni claves de AWS.

## 2. Subir el proyecto desde Windows

El paquete `tienda-cocis-aws.tar.gz` preparado junto al proyecto contiene el
código y los archivos de despliegue, sin dependencias instaladas ni secretos.
Los comandos siguientes se ejecutan en **PowerShell de tu PC**. Sustituye la
IP de ejemplo y ajusta la ubicación de la clave:

```powershell
$ec2Address = 'REEMPLAZAR_POR_IP_PUBLICA'
$ec2Key = "$env:USERPROFILE\Downloads\tienda-cocis.pem"
scp -i "$ec2Key" "C:\Users\Javier\Documents\Proyecto_seminario_grupo\tienda-cocis-aws.tar.gz" "ubuntu@${ec2Address}:/home/ubuntu/"
ssh -i "$ec2Key" "ubuntu@$ec2Address"
```

En la primera conexión verifica la huella SSH con la de la instancia antes de
aceptarla. Si SSH señala permisos demasiado abiertos en la clave, restringe
su acceso a tu usuario de Windows; no desactives la comprobación.

## 3. Instalar y configurar en EC2

Desde la sesión **SSH de Ubuntu**:

```bash
mkdir -p ~/tienda-cocis
cd ~/tienda-cocis
tar -xzf ~/tienda-cocis-aws.tar.gz
sudo bash deploy/install-docker-ubuntu.sh
cp .env.ec2.example .env.ec2
chmod 600 .env.ec2
openssl rand -hex 32
```

Guarda la cadena generada como `POSTGRES_PASSWORD` en `.env.ec2`. Debe ser
hexadecimal, para que funcione directamente dentro de `DATABASE_URL`.
Genera después el hash de la contraseña de acceso a la web:

```bash
sudo docker run --rm -it caddy:2-alpine caddy hash-password
nano .env.ec2
```

El comando solicita la contraseña sin mostrarla. Pega el hash completo como
`DEMO_PASSWORD_HASH`, **entre comillas simples**, conservando todos los `$`:

```dotenv
DEMO_PASSWORD_HASH='PEGAR_AQUI_EL_HASH_COMPLETO'
```

Mantén `DEMO_USER=seminario`, `SITE_ADDRESS=http://localhost`,
`LISTEN_IP=127.0.0.1`, `HTTP_PORT=8088` y `HTTPS_PORT=8443`.
La contraseña web es distinta de la contraseña de PostgreSQL. El navegador
pedirá el usuario `seminario` y la contraseña original, no el hash.

## 4. Iniciar los servicios

En Ubuntu, desde `~/tienda-cocis`:

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml config --quiet
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml up -d --build --wait --wait-timeout 180
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml logs --tail=80
```

La primera compilación puede tardar varios minutos. PostgreSQL, backend y
frontend tienen comprobaciones de salud; el backend prueba una consulta real
a productos. Caddy es el único servicio que publica puertos, inicialmente
solo en la interfaz local del servidor.

## 5. Abrir la aplicación sin dominio

En **otra ventana de PowerShell en tu PC**, ejecuta y deja abierto:

```powershell
$ec2Address = 'REEMPLAZAR_POR_IP_PUBLICA'
$ec2Key = "$env:USERPROFILE\Downloads\tienda-cocis.pem"
ssh -i "$ec2Key" -N -o ExitOnForwardFailure=yes -L 127.0.0.1:8088:127.0.0.1:8088 "ubuntu@$ec2Address"
```

Abre **http://localhost:8088** y entra con las credenciales de la demo.
El tramo entre tu PC y AWS está cifrado por SSH. No abras el puerto 8088 en
AWS ni cambies `LISTEN_IP` a `0.0.0.0` mientras uses HTTP con contraseña.
Esta opción sirve para presentar desde tu computadora o compartir pantalla;
no proporciona todavía un enlace público para los compañeros.

Prueba productos e inventario: crear, editar y eliminar registros de prueba.
Reinicia los servicios y verifica que persisten los registros que conservaste:

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml restart
```

`Ctrl+C` cierra el túnel SSH; los contenedores siguen ejecutándose en EC2.
Después de detener y arrancar EC2, comprueba su IP pública: puede cambiar.

## 6. Publicar con dominio y HTTPS más adelante

1. Apunta el registro DNS **A** del subdominio a la IP pública de EC2.
   Una Elastic IP permite mantenerla fija; revisa su costo. No publiques un
   registro AAAA salvo que hayas configurado también IPv6.
2. Abre TCP 80 y 443 para visitantes en el grupo de seguridad. Mantén SSH
   limitado a tu IP. No abras 3000, 8080, 5432 ni 5434.
3. Cambia estos valores en `.env.ec2`:

```dotenv
SITE_ADDRESS=tienda.tudominio.com
LISTEN_IP=0.0.0.0
HTTP_PORT=80
HTTPS_PORT=443
```

4. Aplica y revisa el certificado:

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml up -d
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml logs --tail=80 proxy
```

Caddy obtiene y renueva el certificado cuando el DNS y los puertos son
correctos. Abre `https://tienda.tudominio.com`. La contraseña protege tanto
la interfaz como `/api/*`. Esta protección es para la demo: no implementa
usuarios individuales, roles ni auditoría de un sistema comercial.

## 7. Datos y mantenimiento

En Ubuntu, genera una copia lógica antes de actualizar:

```bash
mkdir -p backups
chmod 700 backups
umask 077
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml exec -T db pg_dump -U cocis -d tiendacocis -Fc > "backups/tiendacocis-$(date +%Y%m%d-%H%M%S).dump"
```

Descarga las copias a tu PC con `scp`; un respaldo en el mismo disco no
protege frente a la pérdida de la instancia. Para comprobar un respaldo,
restáuralo primero en una base separada y verifica las tablas antes de
considerarlo recuperable. `pg_restore --list` permite inspeccionar su índice.

Después de subir código actualizado, ejecuta de nuevo `up -d --build --wait`.
No uses `down -v`: elimina los volúmenes y los datos. `init.sql` solo se
ejecuta cuando el volumen de PostgreSQL está vacío. Cambiar
`POSTGRES_PASSWORD` en el archivo no cambia la contraseña de una base ya
inicializada; requiere una rotación coordinada dentro de PostgreSQL.

Si ya tienes registros locales que deseas conservar, realiza una exportación
y restauración específica antes de empezar a trabajar en EC2. Esta guía
inicializa una base nueva con los datos de ejemplo.

## Solución de problemas

| Síntoma | Revisión |
|---|---|
| SSH no conecta | IP actual, instancia encendida, usuario `ubuntu`, clave correcta y puerto 22 desde tu IP actual |
| Puerto local ocupado | Cambia solo el primer `8088` del argumento `-L` y usa ese puerto en el navegador |
| Error 401 | Usuario y contraseña de demo; verifica comillas simples del hash en `.env.ec2` |
| Error 502 | Estado de backend/frontend y sus logs |
| Backend unhealthy | Contraseña de DB, estado de PostgreSQL y logs del backend |
| Frontend intenta localhost:8080 | Reconstruye con el Dockerfile incluido; `/api` se configura durante el build |
| HTTPS no obtiene certificado | DNS A, puertos 80/443 y ausencia de un AAAA incorrecto |
| Compilación termina con código 137 | Memoria insuficiente; revisar recursos de EC2 |

## Referencias

- [Crear una instancia EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html)
- [Precios de EC2](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Instalación oficial de Docker en Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Salida standalone de Next.js](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output)
- [Autenticación de Caddy](https://caddyserver.com/docs/caddyfile/directives/basic_auth)
