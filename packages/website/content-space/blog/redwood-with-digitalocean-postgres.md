# Redwood with DigitalOcean Postgres
- Slug: redwood-with-digitalocean-postgres
- Published: 2021-02-09

## Body

[Redwood](https://redwoodjs.com/) is a simple and powerful full-stack web framework for Node and React. It's very enjoyable to use and feels very well integrated, like Django and Rails.

It's designed for serverless and uses Prisma for accessing a database. With serverless and PostgreSQL, it's important to use pgbouncer, because there can be a lot of serverless instances, and each needs its own connection. The default limit of the number of connections to a PostgreSQL database is low for using serverless.

The docs cover how to set up a Prisma database connection pgbouncer, but there are a couple of details we needed to figure out.

First is how to properly set up a database, a user, and a connection pool within a database server in DigitalOcean.

To start, create a database server. $15 is a good price for starting out. It brings the total monthly price for using a Netlify Pro account ($19/user) and a DigitalOcean database ($15) to $34.

Once you have the database server, create a database, a user, and a connection pool. DigitalOcean doesn't have a way to set the permissions for a user, so you'll need to do that by logging in as the admin user and running SQL commands, either manually or through a GUI like pgAdmin or Postico. For a typical app, the user app's database user should only have access to one database.

Give the user and database the same name. When creating the user it will generate a password. Copy that somewhere such as a .env file or a password manager.

When you create the connection pool, be sure to select the user and the database. These will be the only ones that can use the connection pool. The connection pool can have the same name as the user and database as well.

For the connection pool type, choose Transaction. These will be very short, and when they're done, will be released to the pool. Because of this, the number for the Pool Size doesn't need to be very large. You should choose a number based on how important the connection pool is and how much you need left over for other connection pools. For instance, if you have 5 apps and 5 databases, and the total available is 22, choose 4. This is not the limit of concurrent HTTP requests. An HTTP request could take two seconds and only be using the database for a tenth or a hundredth of a second. So it could handle a decent amount of traffic.

Finally, for the database URL, use the following, replacing with items from your connection details on the connection pool:

These three items in the query are the key: pgbouncer=true&sslmode=require&connection_limit=1

These properly configure it for SSL, serverless, and pgbouncer.

Set the DATABASE environment variable, and deploy to a serverless platform such as Netlify, and you should be set, at least for a simple app with a handful of users!

We're excited about Redwood and plan to use it a lot and blog about it. Follow us on one of the social media sites below for updates.
