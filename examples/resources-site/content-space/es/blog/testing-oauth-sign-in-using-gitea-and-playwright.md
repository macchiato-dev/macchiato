# Pruebas de inicio de sesión OAuth con Gitea y Playwright
- Slug: testing-oauth-sign-in-using-gitea-and-playwright
- Published: 2020-11-28

## Body

Traducción del [artículo original en inglés](/language/en/blog/testing-oauth-sign-in-using-gitea-and-playwright).

Nuestra aplicación tenía un flujo OAuth genérico para GitHub, GitLab y otros proveedores. Probarlo directamente con GitHub en CI requería confirmar algunos accesos por correo, así que buscamos una opción autocontenida.

[Gitea](https://gitea.io/) es un servicio Git ligero y abierto que también ofrece OAuth. Ejecutarlo dentro de CI permite probar el flujo real sin simular el proveedor. Playwright controla el navegador durante la prueba.

La imagen se configura para saltar la pantalla inicial, desactivar registros públicos y crear un usuario administrativo mediante la CLI. Una imagen personalizada ejecuta las migraciones, crea el usuario y después inicia el servicio.

La aplicación OAuth se crea mediante la API HTTP de Gitea con un Client ID, un secreto y una URL de callback. La configuración funciona tanto localmente como en CI y los comandos complejos viven en `package.json`, no en el archivo específico de GitLab CI.

La primera autorización puede mostrar un botón de confirmación; las siguientes suelen volver directamente a la aplicación. La prueba contempla ambos casos. También puede ejecutarse con navegador visible para depurarla.

Gitea incluye usuarios, organizaciones, búsqueda, incidencias, OAuth y cuentas vinculadas con un consumo modesto. Eso lo vuelve una base interesante para aplicaciones autocontenidas y con control de versiones.
