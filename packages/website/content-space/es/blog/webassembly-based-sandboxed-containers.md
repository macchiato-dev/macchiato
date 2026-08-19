# Contenedores aislados basados en WebAssembly
- Slug: webassembly-based-sandboxed-containers
- Published: 2026-08-03

## Body

Desde hace tiempo trabajo en el problema de ejecutar código no confiable o parcialmente confiable dentro de contenedores. Sería útil poder ejecutar sobre datos privados código de un contratista al que acabo de conocer, o código producido por un agente, sin revisarlo antes, siempre que se ejecute en un contenedor suficientemente estricto. Un ejemplo de este tipo de contenedor sería una MicroVM sin acceso a la red.

Como ejemplo de código no confiable con datos privados, pensemos en una presentación sofisticada de resultados financieros que no puede filtrarse antes de tiempo. Si alguien la desarrollara como una página web y la página pudiera cargar una imagen desde cualquier servidor, podría codificar los datos en la URL. Alguien con acceso a los registros del servidor podría obtener la URL, decodificarla y acceder a los datos privados.

Desarrollé un proyecto llamado [ristretto](https://news.ycombinator.com/item?id=41022890) con esto en mente y, durante el proceso, descubrí que WebAssembly era mi enfoque favorito. Había usado políticas de seguridad de contenido con iframes, pero, aunque son buenas para el aislamiento, no controlan el acceso al nivel que buscaba. Impedir que se sigan enlaces también resulta artificioso: envolví el contenido en un iframe anidado para evitar la exfiltración mediante ingeniería social que convenciera a alguien de pulsar un enlace que codificara los datos privados.

Hoy presento el comienzo de un proyecto para ejecutar código en WebAssembly mediante contenedores que permiten únicamente interacciones limitadas. Esto permite que código diseñado para resistir la exfiltración se ejecute sin un iframe y conserve el control de su propio comportamiento. Los contenedores se encuentran actualmente en fase alfa, pero conceptualmente limitan el código que se ejecuta en WebAssembly a capacidades específicas. Una inspiración anterior es [WASM-4](https://wasm4.org/), que concede acceso solamente a una pantalla basada en píxeles y a la entrada. Este proyecto amplía la idea permitiendo acceso cuidadosamente acotado a recursos de una página web y controlando el tamaño, la complejidad y la frecuencia de las interacciones.

![Los datos privados entran en un entorno aislado WebAssembly cuyos canales de capacidades producen un documento del navegador.](/-/blog-images/webassembly-capability-container.png "Un contenedor WebAssembly expone capacidades seleccionadas en lugar del navegador circundante.")

Estos son los contenedores actuales:

- [Article](/try/article): un conjunto pequeño de HTML semántico, estilos restringidos y enlaces que coinciden con patrones de URL configurados.
- [Page](/try/hello): un vocabulario de diseño más general cuyo DOM y CSS siguen controlados por esquemas.
- [SVG](/try/mark): una superficie vectorial acotada para formas, trazados, texto y gradientes declarativos.
- [Canvas](/try/ball): operaciones limitadas de dibujo y animación en vez de acceso al navegador circundante.

![Cinco superficies acotadas representan los contenedores article, page, SVG, canvas y editor de código.](/-/blog-images/webassembly-container-surfaces.png "Los contenedores componen máquinas WebAssembly, módulos *-use y configuraciones revisadas para un tipo concreto de documento.")

Un contenedor es un entorno reutilizable compuesto por máquinas WebAssembly, módulos *-use y sus configuraciones, de modo que un proyecto pueda seleccionar un conjunto revisado de capacidades en vez de reconstruirlo cada vez.

Estos contenedores se apoyan en componentes como dom-use, que toma el concepto de *browser use* y lo aplica a partes específicas del DOM. El host valida la forma del DOM, los atributos, las URL, los estilos, las suscripciones a eventos y las mutaciones. Un contenedor puede combinar varios de estos módulos *-use y sus configuraciones sin repetir la política para cada proyecto.

También tengo en desarrollo otro contenedor llamado *Code Editor Use*, que proporciona una superficie restringida para CodeMirror. Ejecuta la configuración del editor dentro de QuickJS compilado a WebAssembly y transmite las operaciones DOM y los eventos de entrada permitidos mediante un puente con el host. Ya se utiliza en el área de pruebas de proyectos. Hay un trabajo similar en curso para la edición de texto enriquecido, mientras que los editores personalizados que necesiten una superficie de navegador mucho más amplia todavía pueden aislarse mediante un iframe en un origen independiente.

Esto todavía no constituye una afirmación de que cualquier código hostil sea seguro. Los límites de capacidades y recursos, el modelo de eventos, el manejo de URL y las implementaciones del host necesitan más pruebas y auditorías. El cambio útil consiste en hacer que la autoridad sea una parte explícita del contenedor: el acceso a la red, el almacenamiento, los enlaces, los elementos, los estilos y las operaciones del host pueden estar ausentes o concederse de forma limitada, en vez de llegar juntos con un objeto global de navegador.

El objetivo es encontrar un punto medio práctico entre confiar en una aplicación y colocar cada aplicación pequeña dentro de una máquina virtual completa. Una herramienta diminuta debería poder iniciarse rápidamente, ejecutarse localmente o en un servidor y recibir solamente las capacidades que necesita. Si estos contenedores siguen ganando compatibilidad sin perder facilidad de inspección, podrían facilitar mucho probar herramientas producidas por agentes y documentos interactivos de terceros sobre datos sensibles. El siguiente paso no es declarar terminado el aislamiento, sino continuar reduciendo sus contratos, haciendo más predecible su comportamiento y facilitando las pruebas y auditorías de sus propiedades de seguridad.

Sigue a Resources.co en [X](https://x.com/ResourcesCo) o [LinkedIn](https://www.linkedin.com/company/resources-co/) para recibir novedades. Planeamos ampliar este trabajo más allá de las superficies del navegador con contenedores de backend y full stack basados en el mismo modelo de capacidades explícitas.

*Actualización:* Los enlaces anteriores ahora abren plantillas relacionadas porque se ha publicado un nuevo contenedor genérico.
