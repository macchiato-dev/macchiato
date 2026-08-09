# Redwood con PostgreSQL de DigitalOcean
- Slug: redwood-with-digitalocean-postgres
- Published: 2021-02-09

## Body

Traducción del [artículo original en inglés](/language/en/blog/redwood-with-digitalocean-postgres).

[Redwood](https://redwoodjs.com/) es un framework full-stack para Node y React. Está pensado para funciones serverless y utiliza Prisma. Con PostgreSQL conviene usar PgBouncer porque muchas instancias pueden abrir conexiones y el límite del servidor suele ser bajo.

En DigitalOcean hay que crear el servidor, una base de datos, un usuario y un pool. Conviene que usuario y base tengan el mismo nombre y limitar ese usuario a una sola base.

Al crear el pool hay que seleccionar tanto el usuario como la base y escoger el modo Transaction. Las operaciones de base de datos son breves, así que el tamaño del pool no equivale al número máximo de solicitudes HTTP simultáneas.

La URL de Prisma debe incluir `pgbouncer=true&sslmode=require&connection_limit=1`. Estas opciones activan TLS y configuran correctamente Prisma para PgBouncer y un entorno serverless.

Después se establece la variable de entorno de la base de datos y se despliega en la plataforma serverless. Es suficiente para comenzar con una aplicación pequeña.
