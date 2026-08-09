# Testing OAuth Sign In Using Gitea and Playwright
- Slug: testing-oauth-sign-in-using-gitea-and-playwright
- Published: 2020-11-28

## Body

We have a generic OAuth Sign-in flow on the app we're building. There is a button for each provider: Sign In With GitHub, Sign In With GitLab, etc.

To test this, I first started by using GitHub. I have a test account that doesn't have access to everything my personal account has access to. I can put the username and password into GitLab CI's settings so they aren't in the repository. I realized, however, that it requires confirming the new login by clicking a link in an email. This isn't the best for running in CI.

After that realization, I decided to do something that was self-contained, and the idea came to use a [Gitea](https://gitea.io/) instance. [Gitea](https://gitea.io/) is an Open Source Git service like GitLab, but is written in Go and is very lightweight. It also has an OAuth provider. Instead of mocking an OAuth service, why not run Gitea inside the CI?

It took some work to get it set up, but it is running smoothly. Playwright, a powerful new browser automation tool, and Jest, a testing framework, are used to run the sign-in test.

This post is just a high level overview. The details are in the git repository, [ResourcesCo/app](https://github.com/ResourcesCo/app) on both [GitHub](https://github.com/ResourcesCo/app) and [GitLab](https://gitlab.com/ResourcesCo/app).

[Gitea can be run with Docker](https://docs.gitea.io/en-us/install-with-docker/) by using the gitea/gitea image on Docker Hub. It can be configured using environment variables. The environment variables are used to generate the configuration file. I would run it and see a setup screen.

While going through the setup screen in Playwright would be possible, we wanted everything to be set up when it gets to Playwright, so all it is doing is testing our app's OAuth sign in.

To skip past the setup screen, I need to explicitly set the DB_TYPE environment variable to sqlite3 , which is the default and set the INSTALL_LOCK environment variable to true .

Besides skipping the setup screen, I need a user to sign in as, and an OAuth application. This is the same as when signing in with another service, such as GitHub. The OAuth application has a Client ID, a Client Secret, and a Callback URL.

Creating the initial user is trickier. It would be best to just start off with one admin user, and pass the username and password when running docker. This functionality isn't built into Gitea's Docker image. I also didn't want to have signup enabled, because I am thinking about using Gitea as a backend for a web app, and it would be good for security to have it locked down. I found that I could use the environment variable DISABLE_REGISTRATION to prevent unwanted sign-ups and that I could use the [gitea CLI](https://docs.gitea.io/en-us/command-line/) to create the initial user directly in the database. I could run the gitea CLI using docker exec on my local docker setup, but on GitLab CI, I am unsure how to run docker exec on a GitLab CI service.

So instead of running docker exec, I made a new Docker image, which is built in GitLab CI, pushed to GitLab's docker registry, and run as a GitLab CI service. A GitLab CI service is a Docker container that runs concurrently with a GitLab CI step. The most common are databases. This one uses a postgres service in addition to the Gitea service.

The custom Gitea service's Docker implementation is just a [Dockerfile](https://github.com/ResourcesCo/app/blob/641fd5ad57f9ef3398bf1c4aa4aa2c067e2567e7/packages/api/test/fixtures/gitea/Dockerfile) and a [custom entrypoint](https://github.com/ResourcesCo/app/blob/641fd5ad57f9ef3398bf1c4aa4aa2c067e2567e7/packages/api/test/fixtures/gitea/setup-entrypoint). The custom entrypoint runs the original entrypoint once without starting the service in order to run its setup tasks, then runs the database migrations, then runs the command to create the user, and finally runs the original entrypoint to start the service.

The OAuth Application is created using gitea's swagger-documented HTTP API, using the user's username and password. It's important to get the callback URL right. [This curl command is a script in the package.json.](https://github.com/ResourcesCo/app/blob/641fd5ad57f9ef3398bf1c4aa4aa2c067e2567e7/package.json#L19)

Everything needs to be able to be run both locally and in CI. So instead of putting intricate commands in gitlab-ci.yml, they will go into package.json so they can be called both when developing locally and when running the CI. [gitlab-ci.yml is fairly short.](https://github.com/ResourcesCo/app/blob/641fd5ad57f9ef3398bf1c4aa4aa2c067e2567e7/.gitlab-ci.yml)

There are a lot of environment variables. In development, these are managed by env-cmd which is an alternative to dotenv that supports defining them in JSON. Because GitLab CI manages its own environment variables, the --silent flag is passed to env-cmd.

The top-level project contains two inner npm packages: one for the Next.js and one for the API. Each of these has its own scripts, which are called by the top-level project's scripts.

The end-to-end testing step in gitlab-ci.yml uses the Playwright docker image, which contains a full Node.js installation. It uses the postgres service and the custom gitea service. The custom gitea service uses a Docker image that is created in a previous step. It's exciting to be able to put these components together like legos!

[jest-playwright](https://github.com/playwright-community/jest-playwright) is used to run the tests. [I relied heavily on the official API docs.](https://github.com/microsoft/playwright/blob/master/docs/api.md)

When signing in, a user needs to click Authorize Application the first time signing in. After that, it just goes straight back to the app. To handle this ambiguity, [I used Promise.race, which returns when the first promise returns.](https://github.com/ResourcesCo/app/blob/641fd5ad57f9ef3398bf1c4aa4aa2c067e2567e7/packages/app/__tests__/login.jsx#L8) If the Authorize Application button is shown, it clicks it.

Sometimes I needed to turn off headless and watch the browser run. This is configured in [jest-playwright.config.js](https://github.com/ResourcesCo/app/blob/641fd5ad57f9ef3398bf1c4aa4aa2c067e2567e7/packages/app/jest-playwright.config.js). To make it more convenient, I made it use an environment variable, so I could run HEADLESS=false yarn app:test instead of editing the file each time.

Playwright was a bit tricky to figure out at times, but it works quite well and its community is rapidly growing and I'm sure it will only get better!

Gitea is very lightweight and can run on a $5 VPS. It is also scalable — Gitea on a $20 VPS could support dozens of users. It's also MIT licensed. It has users, organizations, search, issues, OAuth, sending emails, password resets, and Linked Accounts. I think it could be used as the backend for a lot of different sorts of apps, especially ones that can benefit from version control, such as content management systems and developer tools. It has great docs and even has support for Let's Encrypt for SSL.

It could do similar things to [Sandstorm.io](https://sandstorm.io/) and [Strapi](https://strapi.io/), but with git for version control. I wonder how well it would run together with OpenFaaS's faasd in a $10/mo VPS to provide a self-hosted app platform based on containers.
