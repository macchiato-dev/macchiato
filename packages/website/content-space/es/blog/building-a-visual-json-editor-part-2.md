# Creación de un editor visual de JSON — Parte 2 de ?: Vista de código
- Slug: building-a-visual-json-editor-part-2
- Published: 2020-10-21

## Body

Traducción del [artículo original en inglés](/language/en/blog/building-a-visual-json-editor-part-2). ([Artículo anterior](/blog/building-a-visual-json-editor).)

Estamos creando un editor visual para toda clase de datos JSON. Los documentos reales pueden contener miles de nodos, cadenas de varias líneas y datos binarios codificados como base64.

Esta parte trata de ver y editar texto de varias líneas, común en gestores de contenido, funciones como servicio, correo y repositorios de código. [vtv](https://github.com/ResourcesCo/resources/tree/develop/packages/vtv) incluye una vista de código basada en CodeMirror.

JSON guarda las cadenas en una sola línea mediante secuencias como `\n`. Es práctico para serializar, pero incómodo para editar. CodeMirror aporta edición y resaltado de sintaxis.

El estado del nodo también guarda el formato que debe usar el resaltado. Estos son los datos y el estado de un objeto con HTML y CSS:

- Example: [Datos y estado del código](/-/blog-examples/vtv/index.html?preset=code-data)

Y esta es su vista:

- Example: [Valores de código resaltados](/-/blog-examples/vtv/index.html?preset=code)

Cada bloque se resalta según su lenguaje. Se puede cambiar el lenguaje desde el menú del nodo y abrir el nodo padre como JSON para copiar o pegar el documento completo.

Todavía hay mucho por mejorar, pero esta vista ya sirve para preparar solicitudes a APIs y trabajar con contenido como HTML, CSS y correo.
