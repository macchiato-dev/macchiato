# Quick Counter

This independent nested project demonstrates `standard-web-app` without an
editor or database. Its HTML, separate stylesheet, and application JavaScript
are ordinary files. `macchiato.app.json` selects validation schemas and the
trusted QuickJS/browser-use bootstrap.

```bash
cd packages/declarative-app-server/example
npm install
npm run detect
npm start
```

Set `PORT=8765` to choose a port; otherwise the operating system chooses one.
The server removes `app.js` from the delivered HTML, preserves validated
`style.css`, and exposes the JavaScript only through the guest manifest. Button
events cross the policy-bound host bridge and update state inside QuickJS.
