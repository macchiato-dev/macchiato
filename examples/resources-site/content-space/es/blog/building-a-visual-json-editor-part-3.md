# Creación de un editor visual de JSON — Parte 3 de ?: Detección de tipos
- Slug: building-a-visual-json-editor-part-3
- Published: 2021-01-22

## Body

Traducción del [artículo original en inglés](/language/en/blog/building-a-visual-json-editor-part-3). ([Artículo anterior](/blog/building-a-visual-json-editor-part-2).)

En JSON todas las cadenas llevan comillas dobles. Eso elimina ambigüedad, aunque añade ruido visual. Nuestro editor se parece más a una hoja de cálculo y permite omitir las comillas cuando el tipo sigue siendo evidente.

Como YAML, mostramos entre comillas las cadenas que, sin ellas, se interpretarían como otro tipo. `"1"` y `"true"` son cadenas; sin comillas serían un número y un booleano.

Para decidirlo intentamos analizar el valor como JSON. Si se puede analizar, una cadena con ese contenido necesita comillas. `hello` no las necesita; `1234` sí. Las comillas que forman parte del texto se escapan y la cadena vacía se muestra como `""`.

Este ejemplo permite editar cadenas y valores que no son cadenas:

- Example: [Cadenas y otros tipos](/-/blog-examples/vtv/index.html?preset=types)

El formato cambia al editar. Es un punto medio: menos ruido que JSON y más información visible que una hoja de cálculo. Tendremos que seguir iterando, pero parece un [valor predeterminado sensato](https://stevebennett.co/2017/07/24/the-power-of-sensible-defaults/).
