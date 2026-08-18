# CodeMirror

Build the shared CodeMirror application from the macchiato workspace first.
Then point this runtime at its guest DOM environment and generated modern
bundle using `WWC_GUEST_ENVIRONMENT` and `WWC_APPLICATION_SOURCE`, as described
in the runtime README.

This example passes only when CodeMirror evaluates inside the QuickJS Wasm
module. Running the same bundle directly in the browser is not acceptance.
