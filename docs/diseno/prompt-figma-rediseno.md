# Prompt — Rediseño profesional de TiendaCocis Perú en Figma

> Uso: este prompt guía la creación del diseño en el archivo de Figma
> `figma.com/design/iz96xsavnE2VUbca0TH2wl` (borrador "Sin título").
> Fecha: 2026-11-19.

---

## Rol

Actúa como diseñador UX/UI sénior especializado en software empresarial
(ERP, WMS, paneles logísticos). Diseña en Figma la interfaz completa de
**TiendaCocis Perú**, un sistema web de gestión de almacén y logística, con
calidad de producto comercial (referencias de nivel: Linear, Vercel
Dashboard, Shopify Admin, Stripe Dashboard).

## Contexto del producto

- Sistema interno para una tienda peruana que vende **insumos de embalaje y
  encomienda** (cajas de cartón, film stretch, plástico burbuja, cintas,
  sobres manila, sacos de rafia). Moneda: **Soles (S/)**. Idioma: español de
  Perú.
- Usuarios: personal de almacén y administración. Uso diario en escritorio
  (1440 px); consulta ocasional desde el celular.
- Stack actual: Next.js 15 + React 19 + Tailwind CSS v4, backend Go con
  arquitectura hexagonal. El diseño debe poder trasladarse a ese código sin
  inventar datos que el backend no tiene.
- Problema actual: interfaz plana y genérica (barra superior con 9 enlaces,
  tarjetas blancas sin jerarquía, tablas sin ayudas visuales, etiquetas
  técnicas como "Precio en Soles (precioUnidad)").

## Objetivo

Una interfaz que transmita orden, control y confianza: que en 5 segundos el
usuario sepa qué productos hay que reponer, qué entregas están en curso y
cuánto vale el almacén.

## Dirección visual

- **Estilo:** limpio, denso pero respirable, tipo SaaS moderno. Fondo gris
  muy claro, superficies blancas, bordes sutiles (1 px), sombras mínimas,
  radios de 8–12 px.
- **Marca:** "TiendaCocis Perú" con un isotipo simple (caja/paquete
  geométrico). Color de marca **rojo Perú `#C8102E`**, usado con moderación:
  logo, indicador del ítem activo del menú, gráficos destacados.
- **Acción primaria:** grafito `#18181B` (botones principales), para que el
  rojo de marca no se confunda con los estados de error.
- **Neutros:** escala zinc (50–950).
- **Semánticos:** éxito esmeralda `#059669`, advertencia ámbar `#D97706`,
  peligro `#DC2626` (siempre acompañado de ícono), información azul
  `#2563EB`. Fondos tintados al 10 % para insignias.
- **Tipografía:** Inter. Escala: 12 / 13 / 14 / 16 / 20 / 24 / 30. Números
  tabulares para cifras y montos; JetBrains Mono 12–13 solo para IDs
  (`inv-006`, `prod-004`).
- **Íconos:** Lucide, trazo 1.5–2 px, 16/20 px.
- **Rejilla:** 12 columnas, márgenes de 32 px, separación de 24 px, espaciado
  en múltiplos de 4.
- **Formatos:** montos `S/ 2,319.00`; fechas `19 nov 2026, 14:30`.
- **Accesibilidad:** contraste AA mínimo, estados de foco visibles, el estado
  nunca se comunica solo con color.

## Estructura de navegación

Reemplazar la barra superior por un **menú lateral fijo (248 px, colapsable a
72 px)** agrupado:

- **General:** Inicio
- **Inventario:** Productos · Inventario · Movimientos
- **Logística:** Entregas · Transportes
- **Catálogos:** Almacenes · Proveedores · Usuarios

Barra superior (64 px): migas de pan, buscador global (⌘K), selector de
almacén activo y avatar del usuario responsable.

## Sistema de diseño (página 1 de Figma)

Crear como variables y componentes con variantes:

1. **Tokens:** colores, tipografía, espaciado, radios, sombras.
2. **Botón:** primario / secundario (borde) / fantasma / peligro × tamaños
   S-M × estados (normal, hover, deshabilitado, cargando) × con o sin ícono.
3. **Insignia de estado:** neutro, éxito, advertencia, peligro, información,
   con punto o ícono. Incluir las de entrega: Pendiente, Asignada, En
   tránsito, Entregada, Cancelada; y las de stock: Óptimo, Bajo stock, Sin
   stock.
4. **Campo de texto, Selector, Fecha, Control segmentado** (para
   Entrada / Salida / Transferencia) con etiqueta, ayuda y error.
5. **Tarjeta KPI:** etiqueta, valor, variación y mini gráfico (sparkline).
6. **Tabla:** encabezado, fila (normal, hover, seleccionada, edición en
   línea), celda de acciones, paginación, barra de filtros y búsqueda.
7. **Menú lateral, ítem de menú, barra superior, migas de pan.**
8. **Modal de confirmación, panel lateral (drawer), aviso tipo toast, estado
   vacío, esqueleto de carga, alerta en línea.**
9. **Barra de progreso de stock** (stock actual frente a stock mínimo).

## Pantallas (página 2 de Figma, desktop 1440 × 1024)

Usar los datos reales del sistema (ver "Datos de ejemplo").

1. **Inicio (panel):**
   - 4 KPI: Productos registrados (7), Registros en almacén, Alertas de stock
     mínimo (3, en rojo), Valor total del almacén (S/).
   - Tarjeta "Reponer pronto": productos con stock ≤ mínimo, barra de
     progreso, botón "Registrar entrada".
   - Gráfico de movimientos de los últimos 7 días (entradas frente a salidas).
   - Entregas por estado (embudo o barras) y lista de entregas de hoy.
   - Actividad reciente (últimos movimientos con responsable y hora).
2. **Productos:** tabla con búsqueda y filtro por categoría; columnas
   Producto (nombre + ID en gris), Categoría (insignia), Precio; edición en
   línea; acción "Nuevo producto" que abre un **panel lateral** con el
   formulario (nombre, categoría, precio).
3. **Inventario:** filtros por almacén y **estrategia de valorización**
   (Estándar / Liquidación −30 % / Volumen ≥ 20 uds) como control segmentado;
   columnas Producto, Almacén, Stock con barra de progreso, Stock mín.,
   Precio base, Valor calculado, Última actualización, Estado. Modal "Editar
   stock mínimo y estrategia" (la cantidad solo cambia con movimientos:
   mostrarla de solo lectura con un enlace a Movimientos).
4. **Movimientos:** a la izquierda, formulario "Registrar movimiento" con
   control segmentado Entrada / Salida / Transferencia (la transferencia
   muestra almacén de destino), producto, almacén, responsable, cantidad y
   estrategia; a la derecha, historial con filtros por almacén y producto,
   insignias Entrada (verde, flecha abajo) y Salida (ámbar, flecha arriba) y
   las transferencias agrupadas como un par vinculado.
5. **Entregas:** vista de lista con pestañas por estado y contador
   (Pendiente, Asignada, En tránsito, Entregada, Cancelada); cada fila muestra
   destinatario, dirección, fecha, vehículo, productos y las acciones de
   cambio de estado permitidas (solo las de `siguientes`). Panel lateral
   "Nueva entrega" con destinatario, dirección, fecha y líneas de productos
   (agregar/quitar línea). Asignar vehículo con un selector de placa ·
   conductor.
6. **Catálogos (plantilla única):** Almacenes, Proveedores (con los
   productos que abastece como chips), Transportes (tipo: camión, furgoneta,
   moto con ícono), Usuarios (avatar con iniciales y correo). Diseñar
   Proveedores completo y Transportes como segunda muestra.

## Estados y móvil (página 3 de Figma)

- Estados: vacío ("Todo el inventario está por encima del mínimo"),
  cargando (esqueleto), error de API, modal de eliminación, toast de éxito.
- Móvil (390 × 844): Inicio y Entregas, con menú inferior o menú hamburguesa.

## Datos de ejemplo (reales del sistema)

| ID | Producto | Categoría | Precio | Stock | Mín. |
|---|---|---|---|---|---|
| prod-001 | Caja de Cartón Shalom Mediana (30x20x20) | Embalaje y Cajas | S/ 4.50 | 120 | 30 |
| prod-002 | Caja de Cartón Shalom Grande Reforzada | Embalaje y Cajas | S/ 8.00 | 12 | 20 |
| prod-003 | Sobre Manila A4 con Burbuja para Encomienda | Sobres y Documentos | S/ 2.50 | 85 | 25 |
| prod-004 | Rollo de Film Stretch Embalaje 50cm | Insumos de Almacén | S/ 28.00 | 6 | 10 |
| prod-005 | Cinta de Embalaje Impresa Shalom (6 unid.) | Precintos y Seguridad | S/ 18.50 | 45 | 15 |
| prod-006 | Rollo Plástico Burbuja Protector 10m | Protección de Carga | S/ 22.00 | 8 | 12 |
| prod-007 | Saco de Rafia Laminado para Encomienda Pesada | Embalaje Pesado | S/ 6.50 | 60 | 20 |

Almacén: "Almacén principal" (`alm-principal`). Usuario: "Administrador"
(`admin@tiendacocis.local`). Se pueden añadir de ejemplo un segundo almacén,
2 transportes, 2 proveedores y 4–6 entregas en distintos estados, siempre con
los campos que existen en el backend.

## Restricciones

- Solo los campos y acciones que el backend ya ofrece (no inventar login,
  roles, precios de compra ni reportes que no existen).
- Ocultar los nombres técnicos de campos (`precioUnidad`, `stockMin`) de la
  interfaz; usar lenguaje natural.
- Respetar los nombres de componentes del código (`Button`, `Badge`, `Card`,
  `Input`, `Select`, `ConfirmModal`) para facilitar el traslado.
- Archivo en plan Starter: **máximo 3 páginas** (Sistema de diseño ·
  Pantallas desktop · Estados y móvil) y cupo limitado de llamadas MCP:
  construir por bloques grandes, reutilizar componentes y auto layout en
  todo.

## Entregable

Archivo de Figma organizado, con componentes reutilizables, auto layout,
variables de color y tipografía, nombres de capas en español y cada pantalla
como un marco con nombre (`01 Inicio`, `02 Productos`, …).
