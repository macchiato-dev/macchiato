# Bunny Edge Scripting worker probe

Paste `worker-probe.js` into a temporary standalone Bunny Edge Script and save
or deploy it. Open the script's hostname directly. The response distinguishes a
real worker implementation from an exposed constructor that throws.

A successful result resembles:

```json
{
  "workerGlobal": "function",
  "dataModuleWorker": true,
  "roundTrip": true,
  "terminated": true,
  "message": { "reply": 42, "workerGlobal": "function", "hasDeno": true }
}
```

If `workerGlobal` is `undefined`, workers are absent. If it is `function` but
`dataModuleWorker` is false, the returned error should identify a Bunny runtime
stub or an unsupported data-module source. The latter does not completely rule
out workers backed by a separately deployed module, but Bunny's single-script
deployment model makes the inline module the useful first test.

Do not attach production secrets or a production pull zone to this probe. It
does not need environment variables, storage, database credentials, or network
access.
