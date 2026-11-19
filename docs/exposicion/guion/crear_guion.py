from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial', boldItalic='Arial-Bold')

# El PDF se genera junto a este script (docs/exposicion/guion/).
OUT = Path(__file__).resolve().parent / 'Guion_Exposicion_Proyecto_TiendaCocis.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleX', fontName='Helvetica-Bold', fontSize=27, leading=31, textColor=colors.HexColor('#123047'), spaceAfter=15))
styles.add(ParagraphStyle(name='SubX', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.HexColor('#147D85'), spaceBefore=14, spaceAfter=7))
styles.add(ParagraphStyle(name='BodyX', fontName='Helvetica', fontSize=10.5, leading=15, spaceAfter=9))
styles.add(ParagraphStyle(name='SmallX', fontName='Helvetica', fontSize=8.5, leading=12, textColor=colors.HexColor('#526572'), spaceAfter=7))
styles.add(ParagraphStyle(name='CellX', fontName='Helvetica', fontSize=9, leading=12))
for style_name in ['TitleX','SubX','BodyX','SmallX','CellX']:
    styles[style_name].fontName = styles[style_name].fontName.replace('Helvetica', 'Arial')
story=[]
def p(s, style='BodyX'): story.append(Paragraph(s,styles[style]))
def h(s): p(s,'SubX')
def title(n,s,time):
    if story: story.append(PageBreak())
    p('TIENDACOCIS  /  GUION DE EXPOSICIÓN  /  '+n,'SmallX')
    p(s,'TitleX')
    p(time,'SmallX')
def say(s): p('<b>Qué decir.</b> '+s)
def show(s): p('<b>Qué mostrar.</b> '+s,'SmallX')
def table(rows,widths):
    t=Table([[Paragraph(c,styles['CellX']) for c in row] for row in rows],colWidths=widths,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DDEEF0')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),0.4,colors.HexColor('#D4DEE4'))]))
    story.append(t); story.append(Spacer(1,10))

title('01','Cómo presentar<br/>el proyecto','Apertura: 1 minuto | Exposición completa sugerida: 12-15 minutos')
say('Buenos días, profesor. Nuestro proyecto se llama TiendaCocis y es una aplicación web para gestionar productos y su inventario. Permite registrar, consultar, actualizar y eliminar información, además de calcular el valor del almacén con distintas estrategias.')
say('El sistema tiene tres partes principales: una interfaz con React y Next.js, una API desarrollada en Go y una base de datos PostgreSQL. La interfaz envía solicitudes HTTP con datos JSON; el backend valida y procesa esas solicitudes, y los repositorios guardan o consultan los datos.')
h('Cómo explicar su construcción')
p('Este orden sirve para explicar la implementación que existe en el código; no pretende reconstruir el orden histórico de trabajo del grupo.')
table([['Paso','Implementación que se explica'],['1. Modelar los datos','Definimos productos y almacen, sus identificadores y su relación.'],['2. Separar responsabilidades','Organizamos el backend en dominio, puertos, servicios y adaptadores.'],['3. Implementar los CRUD','Creamos repositorios SQL, validaciones y rutas HTTP.'],['4. Incorporar patrones','Aplicamos Strategy al inventario y Singleton al acceso compartido a la base de datos.'],['5. Conectar la interfaz','Creamos formularios y tablas que consumen la API mediante fetch.'],['6. Preparar la ejecución','Incluimos Docker, configuración local y archivos de despliegue para EC2.']],[112,387])
show('La estructura de carpetas, las pantallas /products y /inventory y el archivo init.sql.')
h('Cómo usar este guion')
p('Lee los párrafos de “Qué decir” como apoyo y abre los archivos indicados. Las tablas sirven para responder preguntas sin memorizar todos los métodos.')
p('<b>Convención de rutas:</b> B/ significa tienda-cocis-backend/ y F/ significa tienda-cocis-frontend/. Todas las rutas son relativas a la raíz del proyecto. Documento basado en el código local revisado el 10 de noviembre de 2026.','SmallX')

title('02','Arquitectura hexagonal','Explicación: 2 minutos')
say('En el backend usamos arquitectura hexagonal, también llamada puertos y adaptadores. La idea es separar las reglas del negocio de tecnologías como HTTP y PostgreSQL. El núcleo trabaja con interfaces; los adaptadores implementan la comunicación con el exterior.')
table([['Parte','Responsabilidad y ubicación'],['Dominio','B/internal/domain/: Product e Inventory representan los datos; InventoryStrategy define los algoritmos intercambiables.'],['Puertos de entrada','B/internal/ports/inbound.go: contratos ProductService e InventoryService que exponen los casos de uso.'],['Núcleo o servicios','B/internal/core/: valida datos y coordina las operaciones de productos e inventario.'],['Puertos de salida','B/internal/ports/outbound.go: contratos ProductRepository e InventoryRepository para persistir datos.'],['Adaptadores de entrada','B/internal/adapters/inbound/: controladores que reciben HTTP, leen JSON e invocan los servicios.'],['Adaptadores de salida','B/internal/adapters/outbound/: repositorios con SQL y configuración del acceso a PostgreSQL.']],[116,383])
h('Recorrido de una solicitud')
p('<b>Pantalla React → servicio JS → HTTP/JSON → controlador Go → servicio del núcleo → repositorio → PostgreSQL.</b> La respuesta vuelve por el mismo recorrido hasta actualizar la pantalla.')
say('Este recorrido describe la ejecución. Las dependencias del núcleo apuntan a los contratos de ports, no a los repositorios concretos. Por eso podríamos implementar otro repositorio conservando las interfaces y las reglas de negocio.')
h('Dónde se conectan las piezas')
say('En main.go se obtiene el acceso a la base de datos, se crean los repositorios, se pasan a los servicios y estos se pasan a los controladores. Es inyección de dependencias por constructores. Finalmente se registran las rutas y se inicia el servidor.')
show('B/cmd/server/main.go, función iniciarServidor; B/internal/ports/outbound.go; constructor NuevoServicioProducto en B/internal/core/productService.go.')
p('<b>Precisión:</b> la arquitectura hexagonal está en el backend. El frontend se organiza en páginas, componentes y servicios de acceso a la API.','SmallX')

title('03','Patrones utilizados','Explicación: 2 minutos')
h('Repository y separación de servicios')
say('CRUD significa crear, leer, actualizar y eliminar; no es por sí mismo un patrón de diseño. Para implementarlo usamos repositorios, que concentran las consultas SQL, y servicios, que concentran las validaciones y los casos de uso. Así el controlador no necesita escribir SQL.')
show('B/internal/adapters/outbound/productRepository.go y inventoryRepository.go implementan los contratos de B/internal/ports/outbound.go.')
h('Singleton: acceso compartido a PostgreSQL')
say('En database.go, ObtenerInstancia usa sync.Once para inicializar una única instancia de DatabaseConnection dentro del proceso. Ambos repositorios reutilizan ese objeto. Técnicamente contiene un sql.DB, que administra un pool de conexiones: una instancia compartida no significa una sola conexión física.')
show('B/internal/adapters/outbound/database.go: instancia, unaVez, ObtenerInstancia y ObtenerConexion.')
h('Strategy: reglas intercambiables de inventario')
say('InventoryStrategy define CalcularValor, CalcularStock y ObtenerNombre. Las estrategias estándar, liquidación y volumen implementan ese contrato. SeleccionarEstrategia elige la implementación, y el servicio utiliza sus métodos sin repetir cada fórmula.')
table([['Estrategia','Comportamiento del código'],['Estándar','Mantiene el stock. Valor = stock × precio unitario.'],['Liquidación','Mantiene el stock. Valor = stock × precio × 0,70. No modifica el precio del producto guardado.'],['Volumen','Al crear o actualizar, si stock ≥ 20, guarda stock + stock/10 con división entera. Al valorar, si el stock es ≥ 20, aplica factor 0,90.']],[100,399])
p('<b>Ejemplo:</b> con precio S/ 10 y stock 20, el valor estándar es S/ 200 y liquidación muestra S/ 140. Consultar con volumen muestra S/ 180 y conserva 20 unidades. Crear o actualizar enviando 20 con volumen guarda 22 unidades y devuelve una valoración de S/ 198.')
show('B/internal/domain/inventoryStrategy.go y B/internal/core/inventoryService.go. SeleccionarEstrategia usa estándar como opción por defecto.')

title('04','Dónde está el CRUD<br/>de productos','Explicación: 2 minutos')
say('El CRUD de productos se completa entre varias capas. La pantalla recoge los datos, el servicio JavaScript llama a la API, el controlador interpreta la solicitud, el servicio Go valida y el repositorio ejecuta la operación SQL.')
table([['Operación','API HTTP','Servicio Go → repositorio'],['Crear','POST /api/products','CrearProducto → GuardarProducto → INSERT'],['Leer listado','GET /api/products','ListarProductos → ListarProductos → SELECT'],['Leer uno','GET /api/products/{id}','ObtenerProducto → BuscarProducto → SELECT'],['Actualizar','PUT /api/products/{id}','ActualizarProducto → ModificarProducto → UPDATE'],['Eliminar','DELETE /api/products/{id}','EliminarProducto → BorrarProducto → DELETE']],[79,179,241])
h('Ejemplo para explicar “Guardar producto”')
say('Al enviar el formulario de creación, manejarSubmit arma el objeto con nombreProducto, precioUnidad y categoria. crearProducto envía un POST mediante peticionApi. En Go, ManejarProductos deriva a crearProducto, que decodifica el JSON y llama a CrearProducto del núcleo.')
say('El servicio elimina espacios sobrantes, exige nombre y categoría, y comprueba que el precio sea mayor que cero. Si no llega un identificador, genera uno con prefijo prod-. Luego GuardarProducto ejecuta un INSERT parametrizado. El controlador devuelve el producto con estado HTTP 201 y la interfaz vuelve al listado.')
h('Archivos para abrir durante la explicación')
p('<b>Interfaz:</b> F/app/products/create/page.jsx crea; F/app/products/page.jsx lista y coordina actualización y eliminación; F/components/productTable.jsx permite editar filas y confirmar la eliminación.')
p('<b>Comunicación:</b> F/services/productService.js define las llamadas del CRUD y F/services/api.js centraliza fetch y el manejo de errores HTTP.')
p('<b>Backend:</b> B/internal/adapters/inbound/productHandler.go recibe la solicitud; B/internal/core/productService.go valida; B/internal/adapters/outbound/productRepository.go contiene SELECT, INSERT, UPDATE y DELETE.')
p('<b>Idea para recordar:</b> el SQL está en el repositorio; la validación del negocio está en el servicio; el formato HTTP/JSON se maneja en el controlador.','SmallX')

title('05','CRUD de inventario<br/>y base de datos','Explicación: 2 minutos')
say('Inventario tiene su propio CRUD. Para crear un registro se exige un producto existente y se rechazan stock y stockMin negativos. Antes de guardar se calcula el stock según la estrategia y se registra la fecha de actualización. La edición modifica stock y stock mínimo; no cambia el producto asociado.')
table([['Operación','API HTTP','Servicio Go → repositorio'],['Crear','POST /api/inventory','CrearInventario → GuardarInventario'],['Leer listado','GET /api/inventory','ListarInventario → ListarInventario'],['Leer uno','GET /api/inventory/{id}','ObtenerInventario → BuscarInventario'],['Actualizar','PUT /api/inventory/{id}','ActualizarStock → ModificarInventario'],['Eliminar','DELETE /api/inventory/{id}','EliminarInventario → BorrarInventario']],[79,179,241])
p('Las lecturas aceptan <b>?estrategia=estandar</b>, <b>liquidacion</b> o <b>volumen</b>. En creación y actualización, estrategia se envía en el cuerpo JSON. Consultar cambia la valoración devuelta, sin guardar una nueva cantidad.')
show('F/app/inventory/page.jsx crea, lista y elimina; F/app/inventory/[id]/page.jsx edita; F/components/inventoryForm.jsx reúne los campos; F/services/inventoryService.js llama a la API.')
show('B/internal/adapters/inbound/inventoryHandler.go, B/internal/core/inventoryService.go y B/internal/adapters/outbound/inventoryRepository.go.')
h('Relación entre las tablas')
say('productos guarda el identificador, nombre, precio y categoría. almacen guarda su identificador, el producto asociado, stock, stock mínimo y fecha. idProducto es clave foránea y también UNIQUE en almacen: un producto puede tener cero o un registro de inventario.')
p('<b>Eliminación:</b> ON DELETE CASCADE hace que borrar un producto elimine también su inventario. Borrar solamente inventario deja el producto disponible en el catálogo.')
p('<b>Consulta:</b> el repositorio de inventario hace INNER JOIN con productos para recuperar nombre y precio. valorCalculado y estrategiaAplicada se construyen en el servicio y se devuelven en JSON; no son columnas de almacen.')
show('init.sql y la función inicializarTablas de B/internal/adapters/outbound/database.go. La alerta visual aparece cuando stock ≤ stockMin en F/app/inventory/page.jsx.')

title('06','Demostración frente<br/>al profesor','Demostración: 3-4 minutos | Usar registros creados para la exposición')
p('<b>Preparación local:</b> desde la raíz, ejecutar <b>docker compose up -d</b>. En una terminal dentro de tienda-cocis-backend, ejecutar <b>go run ./cmd/server/main.go</b>. En otra, dentro de tienda-cocis-frontend, ejecutar <b>npm install</b> y luego <b>npm run dev</b>. Abrir http://localhost:3000. Requiere Docker, Go, Node.js y dependencias disponibles.','SmallX')
table([['Acción en pantalla','Qué decir y qué resultado esperar'],['1. Crear un producto','Registrar “Producto Demo Seminario”, precio S/ 10 y categoría “Demostración”. “Esto ejecuta POST y termina en INSERT”. Verlo en el listado.'],['2. Editar el producto','Cambiar el nombre a “Producto Demo Editado” y conservar S/ 10. “La misma fila mantiene su ID; PUT modifica los datos con UPDATE”.'],['3. Crear inventario','Asignar el producto con stock 20, mínimo 5 y estrategia estándar en el formulario. “Primero se verifica que el producto exista”. Debe quedar stock 20 y valor S/ 200 en vista estándar.'],['4. Cambiar la visualización','Seleccionar liquidación en el selector superior: S/ 140. Seleccionar volumen: S/ 180. “Estos GET recalculan la valoración; el stock sigue siendo 20”.'],['5. Editar con volumen','Abrir Editar Stock. Escribir 20, mínimo 5 y elegir volumen en el formulario. Al guardar quedan 22 unidades. Al regresar, elegir volumen en el selector superior para mostrar S/ 198.'],['6. Mostrar alerta','Editar otra vez con estrategia estándar, stock 3 y mínimo 5. Debe mostrarse Bajo Stock. “La interfaz compara stock con stockMin”.'],['7. Eliminar y comprobar','Borrar el inventario de prueba y verificar que el producto permanece. Después borrar el producto de prueba. “Completamos ambos CRUD y comprobamos que son entidades relacionadas”.']],[124,375])
p('<b>Detalle de la demo:</b> el selector de visualización y el selector del formulario son controles distintos. Verifica la estrategia en el formulario antes de guardar. La pantalla de edición carga inicialmente el registro con estrategia estándar.','SmallX')
h('Cierre hablado')
say('Con esta demostración mostramos las cuatro operaciones del CRUD, la persistencia en PostgreSQL y la separación de responsabilidades. La arquitectura hexagonal organiza el backend; los repositorios resuelven el acceso a datos, Singleton comparte el acceso a la base de datos y Strategy permite cambiar las reglas del inventario.')

title('07','Preguntas que puede<br/>hacer el profesor','Material de apoyo | Consultar al finalizar la exposición')
h('¿Por qué no poner todo en el controlador?')
p('Porque mezclaríamos HTTP, reglas y SQL. Aquí el controlador traduce la petición, el servicio valida y el repositorio persiste. Cada responsabilidad tiene un lugar identificable.')
h('¿Cómo cambiarían PostgreSQL por otra tecnología?')
p('Implementaríamos los contratos ProductRepository e InventoryRepository con nuevos adaptadores y los conectaríamos en main.go. Las interfaces permiten conservar los servicios, siempre que el nuevo repositorio respete su comportamiento.')
h('¿Cómo agregarían otra estrategia?')
p('Crearíamos un tipo que implemente InventoryStrategy, lo registraríamos en SeleccionarEstrategia y añadiríamos la opción en la interfaz. No hace falta cambiar las fórmulas de las estrategias existentes.')
h('¿Qué pruebas hay y qué falta mejorar?')
p('B/internal/domain/inventoryStrategy_test.go comprueba tres casos: valoración estándar, liquidación y bonificación por volumen. Se pueden ejecutar con go test ./... dentro del backend. Esta revisión documenta esas pruebas; no afirma haberlas ejecutado. Faltaría ampliar pruebas de servicios, API, repositorios y casos límite.')
h('¿El proyecto tiene usuarios y roles?')
p('No se observa un sistema de usuarios y roles en la API revisada. La configuración de despliegue usa autenticación básica en Caddy. Como mejoras se pueden proponer autorización por roles, errores más específicos y tipos decimales adecuados para dinero, pues hoy se usan float64 y DOUBLE PRECISION.')
h('¿Cómo está preparado el despliegue?')
p('docker-compose.yml levanta la base de datos local. compose.ec2.yaml define PostgreSQL, backend, frontend y Caddy para EC2, con volúmenes y comprobaciones de salud. deploy/Caddyfile dirige /api/* al backend y el resto al frontend. Estos archivos muestran la configuración; este guion no certifica el estado actual del servidor.')
h('Frase breve para recordar')
p('<b>“La pantalla solicita, el controlador recibe, el servicio valida, el repositorio ejecuta SQL y la base de datos guarda”.</b>')
p('<b>Fuentes del guion:</b> código local y rutas indicadas en las páginas anteriores, README.md, init.sql, package.json del frontend, go.mod del backend, docker-compose.yml, compose.ec2.yaml y deploy/Caddyfile. No se modificó el código de la aplicación para preparar este documento.','SmallX')

def footer(canvas,doc):
    canvas.saveState()
    w,h=A4
    canvas.setStrokeColor(colors.HexColor('#D4DEE4')); canvas.line(48,43,w-48,43)
    canvas.setFont('Helvetica',8); canvas.setFillColor(colors.HexColor('#526572'))
    canvas.drawString(48,29,'TiendaCocis | Guion basado en el código del proyecto')
    canvas.drawRightString(w-48,29,f'{doc.page} / 7')
    canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=42,bottomMargin=58,title='Guion de exposición del proyecto TiendaCocis',author='TiendaCocis')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(OUT)
assert len(reader.pages)==7, f'Unexpected pages: {len(reader.pages)}'
for idx,page in enumerate(reader.pages):
    assert len(page.extract_text())>500, idx
print(f'{OUT}\nPages: {len(reader.pages)}')
