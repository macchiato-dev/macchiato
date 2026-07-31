# Creación de un editor visual de JSON — Parte 1 de ?
- Slug: building-a-visual-json-editor
- Published: 2020-09-21

## Body

Traducción del [artículo original en inglés](/language/en/blog/building-a-visual-json-editor).

Hace algún tiempo comenzamos a crear una interfaz parecida a un chat grupal con un editor visual de JSON. El trabajo está disponible en [GitHub](https://github.com/ResourcesCo/resources/) y [GitLab](https://gitlab.com/ResourcesCo/resources). Esta es la primera parte de una serie sobre su construcción.

Los datos JSON forman una jerarquía con una raíz, nodos interiores y hojas. Para distinguirlos de un vistazo, mostramos los nombres de los nodos dentro de burbujas. Esto se aplica tanto a las claves de un objeto como a los elementos de un arreglo.

- Example: [Jerarquía visual](/-/blog-examples/vtv/index.html?preset=hierarchy)

Una sangría suficientemente amplia y el mismo estilo de burbuja para claves e índices permiten reconocer la estructura subyacente. La cantidad de elementos aparece entre las llaves o corchetes que utiliza JSON.

La implementación usa React. `NodeView` crea una fila y sus hijos; el estado registra si cada clave está expandida. Las acciones viajan como mensajes con la ruta del nodo y una operación, como editar o insertar.

El modelo es inmutable y todavía faltan funciones importantes, entre ellas deshacer. Aun así, funciona sorprendentemente bien. La biblioteca de componentes se llama [vtv](https://github.com/ResourcesCo/resources/tree/develop/packages/vtv) y su modelo de estado, vtv-model.
