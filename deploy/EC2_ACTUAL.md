# Acceso a TiendaCocis en EC2

Instancia: `i-006d25ec59f9badd2`, nombre `tienda-cocis-seminario`.
Región: Ohio, `us-east-2`.
IPv4 pública al desplegar: `18.189.6.193`.
Sistema: Ubuntu 24.04, x86_64; instancia `t3.small`, 2 GiB de RAM.
Disco: 20 GiB gp3 cifrado. Memoria de intercambio: 2 GiB.

La aplicación está publicada con HTTPS en:

**https://tienda-cocis.18-189-6-193.sslip.io**

Se puede acceder desde cualquier dispositivo con conexión a Internet.
No depende de que tu computadora esté encendida. La instancia EC2 debe
permanecer encendida para que funcione. El navegador solicita usuario y
contraseña antes de permitir el acceso a las páginas y a la API.

En PowerShell, desde la carpeta del proyecto, también puedes abrirla con:

```powershell
.\deploy\Abrir-TiendaCocis.ps1
```

El usuario es `seminario`. La contraseña generada está en
`.deploy-test/demo-password.txt`, excluida de Git y del paquete de despliegue.

La clave privada está en `.deploy-test/tienda-cocis-local.pem` y pertenece a
tu usuario de Windows. Conserva ese archivo y una copia privada segura:
es la clave del par `tienda-cocis-local` importado a EC2. No borres la carpeta
`.deploy-test` mientras contenga la clave y tus datos de acceso.

El grupo de seguridad permite SSH únicamente desde `38.250.155.67/32`, y TCP
80 y 443 desde Internet. HTTP redirige a HTTPS. Si cambia tu IP de conexión,
habrá que actualizar el origen de SSH para administrar la instancia.
PostgreSQL, Go y Next.js se mantienen dentro de la red de contenedores.

En `.env.ec2` del servidor se aplicaron estos valores públicos:

```dotenv
SITE_ADDRESS=tienda-cocis.18-189-6-193.sslip.io
LISTEN_IP=0.0.0.0
HTTP_PORT=80
HTTPS_PORT=443
```

Caddy gestiona el certificado y su renovación; sus datos se conservan en un
volumen Docker. La dirección utiliza DNS de sslip.io. Si la IP pública de la
instancia cambia, será necesario actualizar el nombre en `SITE_ADDRESS`,
recrear el proxy y compartir la nueva URL. Para una dirección permanente,
puedes utilizar una Elastic IP o un dominio propio, revisando sus costos.

En EC2, el proyecto está en `/home/ubuntu/tienda-cocis` y el registro de la
instalación en `/home/ubuntu/deploy.log`. Para consultar los servicios:

```bash
cd /home/ubuntu/tienda-cocis
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml logs --tail=80
```

La consola mostró una tarifa base de USD 0.0208/h para la instancia, además
de almacenamiento e IPv4 pública. Los créditos de CPU están en modo estándar.
Detén la instancia desde EC2 cuando no la necesites; el disco se conserva y
sigue teniendo costo. Al volver a iniciarla, revisa su IP pública y actualiza
la URL y el servidor según corresponda. La clave de host SSH se comprobará en la
siguiente conexión; si la dirección fue reasignada, verifica la identidad de
la instancia antes de modificar `known_hosts`.
