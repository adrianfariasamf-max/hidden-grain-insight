# PRODUCT_GAP_ANALYSIS.md — Hidden Grain v1

Comparación de la aplicación actual contra el **Hidden Grain v1 Product North Star**: diseñar un experimento de percepción (CATA) con exactamente 3 estímulos, publicarlo, recolectar respuestas de participantes reales a través de un enlace público y analizar los resultados.

El análisis es exclusivamente de producto: qué puede o no puede hacer un usuario real hoy desde la interfaz.

---

## 1. Estado por capacidad

### 1.1 Comprensión del producto

| Capacidad | Estado |
|---|---|
| El usuario entiende qué es Hidden Grain al entrar | ✅ Implementado |
| El usuario ve el estado general del sistema | ✅ Implementado |
| El usuario encuentra las áreas principales desde la navegación | ✅ Implementado |

### 1.2 Autoría del experimento (investigador)

| Capacidad | Estado |
|---|---|
| Ver la lista de experimentos existentes | ✅ Implementado |
| Ver el detalle de un experimento | ✅ Implementado |
| Ver si el experimento cumple la invariante de 3 estímulos | ✅ Implementado |
| Publicar un experimento válido | ✅ Implementado |
| **Crear un experimento nuevo desde la UI** | ❌ No implementado |
| **Editar título, descripción, instrucciones y hidden target** | ❌ No implementado |
| **Subir imágenes de estímulos y asignarles posición 1/2/3 + alt text** | ❌ No implementado |
| Cerrar un experimento publicado | ❌ No implementado |

### 1.3 Distribución a participantes

| Capacidad | Estado |
|---|---|
| **Obtener un enlace o QR público del experimento para compartir** | ❌ No implementado |
| Ver cuántas sesiones se han iniciado | ⚠️ Parcial (contador agregado en el detalle, sin panel de monitorización) |

### 1.4 Experiencia del participante

| Capacidad | Estado |
|---|---|
| Abrir el experimento con un token / enlace público | ❌ No implementado |
| Aceptar el consentimiento informado | ❌ No implementado |
| Leer las instrucciones | ❌ No implementado |
| Ver los 3 estímulos | ❌ No implementado |
| Responder CATA por estímulo | ❌ No implementado |
| Ver pantalla de cierre / agradecimiento | ❌ No implementado |

### 1.5 Análisis de resultados

| Capacidad | Estado |
|---|---|
| Ver contadores agregados de sesiones y respuestas | ⚠️ Parcial (sólo totales en el detalle del experimento) |
| **Ver resultados CATA agregados por estímulo (atributos, frecuencias)** | ❌ No implementado |
| **Ver desempeño respecto al hidden target** | ❌ No implementado |
| Ver sesiones individuales de participantes | ❌ No implementado |
| Exportar resultados | ❌ No implementado |

### 1.6 Repositorio de conocimiento (contexto de soporte)

| Capacidad | Estado |
|---|---|
| Explorar Knowledge Objects | ✅ Implementado |
| Crear un Knowledge Object | ✅ Implementado |
| Ver detalle y relaciones (incoming/outgoing) | ✅ Implementado |
| Crear relaciones entre objetos | ✅ Implementado |
| Ver grafo con filtros y leyenda | ✅ Implementado |
| Ver Discovery Workspace con insights | ✅ Implementado |
| Ver System / salud | ✅ Implementado |

---

## 2. Trabajo restante ordenado por impacto de producto

Criterio único: **cuánto acerca cada pieza al momento en que un participante real puede responder un experimento y el investigador puede leer el resultado**.

### Bloque A — Imprescindibles para tener un MVP ejecutable end-to-end

Sin todos estos, el producto **no puede completar ni una sola ejecución real** del experimento.

1. **Pantalla pública del participante con token** — sin ella no existe punto de entrada para responder.
2. **Consentimiento del participante** — condición ética y funcional para iniciar la sesión.
3. **Presentación de los 3 estímulos al participante** — el corazón del experimento.
4. **Formulario CATA de respuesta por estímulo** — sin él no hay datos.
5. **Pantalla de cierre / agradecimiento** — cierra la sesión y confirma envío.
6. **Subida de imágenes de estímulos desde la UI** — hoy el investigador no puede dejar el experimento en `3/3` desde el producto, así que "Publish" queda perpetuamente deshabilitado.
7. **Creación de un experimento nuevo desde la UI** — sin esto, sólo existe el CATA sembrado.
8. **Compartir enlace público del experimento (URL copiable / QR)** — sin él, el investigador no puede repartirlo a 10 personas.

### Bloque B — Necesarios para que el investigador cierre el ciclo

No bloquean la ejecución, pero sin ellos las respuestas recogidas **no generan valor**.

9. **Dashboard de resultados agregados CATA por estímulo** — frecuencias de atributos, ranking.
10. **Vista de desempeño respecto al hidden target** — la razón de ser del experimento de percepción.
11. **Edición del experimento (título, descripción, instrucciones, hidden target)**.
12. **Cerrar un experimento publicado** — cierre formal del estudio.

### Bloque C — Mejoras al ciclo, no bloqueantes del MVP

13. Panel de monitorización de sesiones en curso (más allá de contadores).
14. Vista de sesiones individuales de participantes.
15. Exportación de resultados (CSV o similar).
16. Instrucciones enriquecidas / branding en la pantalla del participante.

### Bloque D — Ya cubierto

El área "Knowledge OS" (Overview, Explorer, Object Detail, Create Object, Graph, Discovery, System) está funcional end-to-end y **no bloquea** el North Star del experimento.

---

## 3. Resumen de prioridad para terminar el MVP

1. Primero: **todo el Bloque A**, en el orden listado. Cualquier orden distinto deja el producto sin poder ejecutar ni una sola respuesta real.
2. Luego: **Bloque B**, para que el investigador pueda leer y cerrar el estudio.
3. Después: **Bloque C**, para pulir la operación.
4. El Bloque D ya está listo.

---

## 4. Veredicto

**Si hoy invitáramos a 10 participantes reales… ¿podríamos ejecutar el experimento completo?**

**No.**

Razones exactas, en orden de bloqueo:

1. **No existe ninguna pantalla para el participante.** No hay URL pública a la que enviarlos: ni entrada por token, ni consentimiento, ni presentación de estímulos, ni formulario CATA, ni pantalla de cierre. Los 10 participantes no tendrían absolutamente nada que abrir.
2. **No existe una forma de compartir el enlace del experimento** (ni URL visible, ni QR, ni acción de "Share"). Aun si la pantalla del participante existiera, el investigador no podría distribuirla desde el producto.
3. **No se puede dejar un experimento en estado publicable desde la UI**, porque no hay uploader de estímulos: el único experimento existente permanece en `0/3` y el botón **Publish experiment** está deshabilitado por la invariante de 3 estímulos exactos.
4. **No se puede crear un experimento nuevo desde la UI**, así que el investigador está limitado al CATA sembrado, que además tampoco puede publicar (ver punto 3).
5. **No hay ninguna vista de resultados agregados CATA ni de desempeño respecto al hidden target.** Aun si llegaran respuestas, el investigador no podría interpretarlas desde el producto.

Hoy el producto permite **explorar el repositorio de conocimiento** y **ver un experimento sembrado**, pero **no permite ejecutar el ciclo de percepción de extremo a extremo**. El MVP del Product North Star **aún no es alcanzable con usuarios reales**.
