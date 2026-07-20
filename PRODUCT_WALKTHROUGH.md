# PRODUCT_WALKTHROUGH.md — Hidden Grain (Perception Studio)

Documento escrito desde la perspectiva de un usuario que abre la aplicación por primera vez. No describe arquitectura, archivos ni código: sólo describe lo que existe visualmente y lo que puede hacerse desde la interfaz.

---

## 0. Elementos globales (visibles en todas las pantallas)

Al entrar en cualquier URL, el usuario ve un **shell** común:

- **Barra lateral izquierda (desktop) / cajón desplegable (móvil)** con la marca "Hidden Grain — Perception Studio" y los siguientes enlaces de navegación, en este orden:
  1. **Overview** → `/`
  2. **Experiments** → `/experiments`
  3. **Explorer** → `/explorer`
  4. **Knowledge Graph** → `/graph`
  5. **Discovery** → `/discover`
  6. **System** → `/system`
- En la parte inferior de la barra aparece la etiqueta `perception mvp`.
- En móvil, además, hay una **barra superior** con un icono de menú (abre la navegación), el logo "Hidden Grain" y una etiqueta `read-only` a la derecha.

El tema es **oscuro** en toda la aplicación. Cada pantalla incluye estados de **carga**, **error** (con botón *Retry*) y **vacío**.

---

## 1. Overview — `/`

- **Propósito:** pantalla de bienvenida. Presenta Hidden Grain y da acceso rápido a las áreas principales.
- **Qué ve el usuario:**
  - Encabezado "Hidden Grain" con subtítulo "Knowledge operating system".
  - Un bloque hero con descripción del producto.
  - Una sección "System status" con el estado del repositorio (salud, métricas, timestamps).
  - Un aviso de tipo read-only al final.
- **Información mostrada:** salud del sistema (OK / degraded), número de objetos y relaciones, versión del esquema, hora de última actualización.
- **Botones y acciones:**
  - **Open Explorer** → navega a `/explorer`.
  - **View Knowledge Graph** → navega a `/graph`.
  - **System details →** (enlace textual) → navega a `/system`.
  - **Retry** (sólo si falla la carga de estado) → vuelve a consultar el estado.

---

## 2. Experiments (listado) — `/experiments`

- **Propósito:** listar todos los experimentos de percepción existentes.
- **Qué ve el usuario:** título "Experiments" y una lista de tarjetas, cada una representando un experimento.
- **Información por tarjeta:** título, descripción breve, estado (`draft` / `published` / `closed` con color distinto), *hidden target*, número de estímulos (`x/3`, con aviso de cuántos faltan) y número de sesiones.
- **Estados:** cargando / error (con *Retry*) / vacío ("No experiments yet").
- **Botones y acciones:**
  - **Click sobre una tarjeta** → navega a `/experiments/:id`.
- **⚠️ Ausente:** en esta pantalla **no existe un botón para crear un nuevo experimento**. Actualmente sólo se ven los experimentos que ya fueron sembrados.

---

## 3. Experiment detail — `/experiments/:id`

- **Propósito:** ver la configuración de un experimento concreto y prepararlo para su publicación.
- **Qué ve el usuario:**
  - Enlace **← All experiments** (vuelve a `/experiments`).
  - Título y descripción del experimento.
  - Panel con campos: **Status**, **Hidden target**, **Stimuli** (`n/3`), **Sessions**, **Responses**, **Publish ready** (yes/no).
  - Sección **Instructions** (si existen).
  - Sección **Stimuli**: lista de los estímulos cargados, cada uno con su posición (#1, #2, #3) y su *alt text* o ruta.
  - Sección **Publish readiness**: si no está listo, muestra la lista de razones (p. ej. "Experiment requires exactly 3 stimuli", "Missing position(s): 2, 3").
- **Botones y acciones:**
  - **← All experiments** → vuelve al listado.
  - **Publish experiment** (sólo si el estado es `draft`) → publica el experimento; queda **deshabilitado** hasta que se cumpla la invariante de 3 estímulos exactos. Al pulsarlo cambia a "Publishing…" y, si tiene éxito, refresca la información y el estado pasa a `published`. Si falla, se muestra el mensaje de error debajo.
- **⚠️ Ausente en esta pantalla:**
  - No hay botón para **subir/añadir imágenes de estímulos** desde la UI.
  - No hay botón para **editar** el título, la descripción, las instrucciones ni el *hidden target*.
  - No hay botón para **compartir el enlace del participante** ni QR.
  - No hay botón para **cerrar** un experimento publicado.
  - No hay acceso a un **dashboard de resultados** desde aquí.

---

## 4. Explorer — `/explorer`

- **Propósito:** buscar y filtrar Knowledge Objects del repositorio.
- **Qué ve el usuario:**
  - Barra de búsqueda con debounce (300 ms), sincronizada con la URL.
  - Filtros por **type**, **category** y **status** (opciones derivadas de los resultados).
  - Barra de filtros activos que permite quitarlos individualmente.
  - Cuadrícula de **object cards** con: type, título, status, id, versión, número de relaciones y tags.
  - **Paginación** (offset/limit) y conteo total de resultados.
  - Estados carga / error / vacío.
- **Botones y acciones:**
  - **Create object** (arriba a la derecha) → navega a `/objects/new`.
  - **Click en una card** → navega a `/objects/:id`.
  - **Filtros** → actualizan la URL y recargan resultados (reseteando la paginación).
  - **Chips de filtro activo (×)** → quitan un filtro concreto.
  - **Prev / Next / números de página** → cambian el offset.

---

## 5. Create Object — `/objects/new`

- **Propósito:** crear un nuevo Knowledge Object.
- **Qué ve el usuario:** formulario con campos **title**, **type**, **category**, **status**, **summary**, **keywords**, **tags**.
- **Botones y acciones:**
  - **Cancel** → vuelve al Explorer.
  - **Create** (o equivalente) → valida el formulario; si es válido, crea el objeto, invalida las listas y navega a `/objects/:id` del nuevo objeto. Si falla la validación, muestra errores por campo. Está protegido contra doble envío.

---

## 6. Object Detail — `/objects/:id`

- **Propósito:** ver un Knowledge Object completo y sus relaciones.
- **Qué ve el usuario:**
  - Enlace de vuelta a Explorer.
  - Cabecera con título, type, status, versión y timestamps.
  - Bloque de metadatos: category, keywords, tags, descripción/summary.
  - Sección **Outgoing relationships**: lista de relaciones salientes con tipo, destino, badge de resolución (resolved/unresolved), y señales de confianza (provenance/confidence). Los destinos autorreferenciales muestran "Current object" y siguen visibles como resueltos. Los targets no resueltos aparecen claramente no navegables.
  - Sección **Incoming relationships (Backlinks)** con el mismo patrón.
- **Botones y acciones:**
  - **Back to Explorer** → vuelve a `/explorer` conservando filtros previos.
  - **Add relationship** → abre un diálogo modal con búsqueda incremental del objeto destino (excluye autorreferencia), selector de tipo (ontología), descripción y confianza. **Create** persiste la relación e invalida las vistas afectadas; **Cancel** cierra el diálogo.
  - **Click en un target resuelto** → navega al `/objects/:id` de destino.

---

## 7. Knowledge Graph — `/graph`

- **Propósito:** vista estructurada del grafo completo.
- **Qué ve el usuario:**
  - Métricas del grafo (número de nodos, aristas, densidad, etc.).
  - Filtros locales: por tipo de nodo, por ontología de relación y por nivel de confianza.
  - Leyenda de la ontología y de trust.
  - Lista de **nodos** y lista de **aristas** (con paginación incremental "Show more" para escalar).
  - Estados carga / error / vacío.
- **Botones y acciones:**
  - **Filtros / chips** → filtran localmente sin nueva petición.
  - **Show more** en nodos y aristas → amplía el número de elementos visibles.
  - **Click en un nodo** → navega a `/objects/:id`.

---

## 8. Discovery Workspace — `/discover`

- **Propósito:** explorar insights deterministas generados a partir del grafo.
- **Qué ve el usuario:** layout de **tres paneles**:
  1. **Panel izquierdo (lista):** búsqueda local, filtros por prioridad, categoría y tipo de insight, selector de orden.
  2. **Panel central (detalle):** título del insight seleccionado, prioridad, categoría, métricas, explicabilidad (*why* + *evidence*) y objetos involucrados.
  3. **Panel derecho (contexto):** resumen del contexto del grafo alrededor del insight.
- **Botones y acciones:**
  - **Click en un insight** → lo selecciona y actualiza los paneles central y derecho.
  - **Click en un objeto involucrado** → navega a `/objects/:id`.
  - **Filtros / orden / búsqueda** → actualizan la lista.
  - Acciones futuras de **pin / bookmark / dismiss** aparecen previstas pero **aún no operativas** en la UI.

---

## 9. System — `/system`

- **Propósito:** salud y metadatos técnicos del sistema.
- **Qué ve el usuario:** indicador de salud, métricas del repositorio, información de runtime (timestamps UTC formateados), aviso de read-only. Se refresca automáticamente cada 30 s.
- **Botones y acciones:** **Retry** en caso de error.

---

## 10. Pantallas del PARTICIPANTE — **NO EXISTEN**

Actualmente el sistema **no expone ninguna pantalla pública para el participante** de un experimento de percepción. En particular, **no existen**:

- Pantalla de **entrada por token / enlace público** (por ejemplo `/s/:token`).
- Pantalla de **consentimiento informado**.
- Pantalla de **instrucciones previas** al participante.
- Pantalla de **presentación de los 3 estímulos**.
- Pantalla de **respuesta CATA** (marcar atributos por estímulo).
- Pantalla de **agradecimiento / cierre de sesión** del participante.

El *hidden target*, las sesiones y las respuestas existen como concepto interno del experimento, pero el participante no dispone hoy de una interfaz para verlas ni interactuar con ellas.

---

## 11. Pantallas del INVESTIGADOR también ausentes

Además de las pantallas del participante, faltan:

- Pantalla / botón para **crear un experimento nuevo** desde `/experiments`.
- Pantalla o formulario para **editar** un experimento (título, descripción, instrucciones, hidden target).
- Pantalla o widget para **subir imágenes de estímulos** y asignarles posición 1/2/3 y *alt text* (aunque el backend ya emite URLs firmadas).
- Pantalla de **enlace / QR** para compartir el experimento con participantes.
- Pantalla para **cerrar** un experimento publicado.
- **Dashboard de resultados / analítica** del experimento (agregación CATA, hits sobre el *hidden target*, etc.).
- Vista de **sesiones individuales** de participantes.

---

## 12. Recorrido completo de un INVESTIGADOR (estado actual)

1. Entra a `/` (Overview) y ve el estado general del sistema.
2. En la barra lateral hace click en **Experiments** → `/experiments`.
3. Ve la lista de experimentos existentes. **No puede crear uno nuevo desde la UI** (bloqueo).
4. Hace click en el experimento "CATA" (seed) → `/experiments/:id`.
5. Revisa título, descripción, *hidden target*, número de estímulos (`0/3` inicialmente) y motivos por los que aún no puede publicar.
6. **Aquí el recorrido se interrumpe:** no hay UI para subir los 3 estímulos ni para editar el experimento. El botón **Publish experiment** existe pero permanece deshabilitado mientras no haya exactamente 3 estímulos.
7. Suponiendo que los estímulos existan (cargados por otra vía), pulsa **Publish experiment** → el experimento pasa a `published`.
8. **Bloqueo siguiente:** no existe pantalla para compartir el enlace del participante ni para monitorizar sesiones y respuestas desde la UI.
9. Como consuelo, el investigador puede navegar a **Explorer**, **Graph** y **Discovery** para inspeccionar el repositorio de conocimiento, y a **System** para verificar la salud.
10. **No existe** una pantalla de resultados ni de cierre del experimento, por lo que el investigador **no puede finalizar un experimento end-to-end desde la UI actual**.

---

## 13. Recorrido completo de un PARTICIPANTE (estado actual)

El recorrido del participante **no existe todavía**. Un participante que reciba un enlace no encontraría ninguna ruta pública que le permita:

1. Abrir el experimento con un token. *(ausente)*
2. Aceptar el consentimiento. *(ausente)*
3. Leer las instrucciones. *(ausente)*
4. Ver los 3 estímulos. *(ausente)*
5. Responder CATA por estímulo. *(ausente)*
6. Ver la pantalla de cierre / agradecimiento. *(ausente)*

La infraestructura de sesiones y respuestas está prevista, pero **no hay interfaz visible** para el participante.

---

## 14. Cobertura respecto al Product North Star

| Paso del Product North Star | Existe | Parcial | No existe | Comentarios |
|---|---|---|---|---|
| 1. El investigador entra al producto y entiende qué es | ✅ | | | Overview `/` cumple. |
| 2. El investigador ve la lista de sus experimentos | ✅ | | | `/experiments` con estado, estímulos y sesiones. |
| 3. El investigador crea un nuevo experimento | | | ❌ | No hay botón ni formulario de creación en la UI. |
| 4. El investigador define título, descripción, instrucciones y *hidden target* | | | ❌ | No hay pantalla de edición. |
| 5. El investigador sube exactamente 3 estímulos con posición y *alt text* | | | ❌ | No hay uploader visible; sólo se listan estímulos ya existentes. |
| 6. El investigador ve si el experimento cumple la invariante de 3 estímulos | ✅ | | | Sección "Publish readiness" con razones. |
| 7. El investigador publica el experimento | ✅ | | | Botón **Publish experiment** con guard de invariante. |
| 8. El investigador comparte el enlace/QR con participantes | | | ❌ | No existe pantalla ni acción para compartir. |
| 9. El participante abre el enlace con su token | | | ❌ | No existe la ruta pública del participante. |
| 10. El participante acepta el consentimiento | | | ❌ | Sin pantalla. |
| 11. El participante lee las instrucciones | | | ❌ | Sin pantalla. |
| 12. El participante ve los 3 estímulos | | | ❌ | Sin pantalla. |
| 13. El participante responde CATA por estímulo | | | ❌ | Sin pantalla. |
| 14. El participante finaliza la sesión y ve confirmación | | | ❌ | Sin pantalla. |
| 15. El investigador monitoriza sesiones y respuestas en curso | | ⚠️ | | Detalle del experimento muestra contadores agregados de sesiones y respuestas, pero no un panel de monitorización real. |
| 16. El investigador analiza los resultados (agregados CATA, *hidden target*) | | | ❌ | No hay dashboard de resultados. |
| 17. El investigador cierra el experimento | | | ❌ | No hay acción de cierre en la UI. |
| 18. El investigador explora el repositorio de conocimiento asociado | ✅ | | | Explorer, Object Detail, Graph, Discovery. |
| 19. El investigador crea y conecta Knowledge Objects | ✅ | | | `/objects/new` + diálogo *Add relationship*. |
| 20. El investigador supervisa el estado del sistema | ✅ | | | `/system` con polling de 30 s. |

---

### Resumen ejecutivo (visible al usuario)

- El **lado "Knowledge OS"** (Overview, Explorer, Object Detail, Create Object, Graph, Discovery, System) está **completo y navegable end-to-end**.
- El **lado "Perception Studio"** sólo permite hoy **ver un experimento existente y publicarlo si ya tiene 3 estímulos**. Falta prácticamente toda la experiencia de **autoría del experimento**, **experiencia del participante** y **análisis de resultados** para que el Product North Star sea alcanzable desde la UI.