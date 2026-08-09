# Generar diapositivas a partir del código
- Slug: generating-slides-from-code
- Published: 2026-08-07

## Body

> Esta es una traducción. [Ver el original en inglés](/blog/generating-slides-from-code?lang=en).

Leer un código base y presentarlo son tareas distintas. Un árbol de directorios orienta y un explorador de código da acceso, pero ninguno decide qué debe entender primero quien lee, qué invariantes merecen una explicación o dónde un archivo responde una pregunta planteada por otro.

Estoy experimentando con un recorrido de código generado que trata las diapositivas como una lectura separada y versionada de un directorio fuente. Conserva una instantánea de los archivos, divide la lectura canónica en capítulos y coloca fragmentos seleccionados junto a una narrativa escrita a partir de un análisis más amplio. Los fragmentos preliminares introducen ideas; los canónicos abarcan cada línea relevante sin fingir que todas tienen la misma importancia.

- Example: [Explorar el recorrido exportado de dom-use](/benatkin/dom-use-tour/embed)
- Project: [benatkin / DOM use code tour](/benatkin/dom-use-tour)

El ejemplo incrustado es una exportación, no la aplicación de autoría. No depende de un servidor y guarda las notas, el progreso de lectura y el historial de diapositivas en el almacenamiento de sesión. Así puede alojarse como página estática, descargarse o abrirse dentro de un contenedor de proyecto restringido.

Las notas forman parte del ciclo de refinamiento. Una diapositiva confusa puede revelar una explicación arquitectónica débil, una narrativa incompleta o incluso una invariante del código que merece un comentario conciso. El código fuente sigue siendo la autoridad; regenerar el recorrido actualiza su copia inmutable y reinicia el progreso asociado a la revisión.

Esto todavía es experimental. La pregunta interesante no es si una IA puede poner código en diapositivas, sino si un recorrido generado puede ayudar a construir un modelo mental duradero de un paquete sin dejar de ser exhaustivo, inspeccionable y sensible a una lectura cuidadosa.
