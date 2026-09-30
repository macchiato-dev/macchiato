// The example deliberately uses the same HTTP compiler API as project builds.
const root = new URL("./", import.meta.url);
const output = new URL("dist/", root);
const keyPath = new URL("../../../../macchiato-work/rust-compiler/api-key", root);
const key = (await Deno.readTextFile(keyPath)).trim();
const read = name => Deno.readTextFile(new URL(name, root));
const file = async name => ({ path: name, content: await read(name) });
const base64 = bytes => {
  let result = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(result);
};
const bridge = await read("frame.js");
const lines = bridge.trimEnd().split("\n");
if (lines.length > 40 || lines.some(line => line.length >= 80)) {
  throw new Error("Frame bridge must be <=40 lines, each <80 characters");
}
await Deno.mkdir(output, { recursive: true });
async function compile(name, files) {
  const response = await fetch("http://127.0.0.1:8791/compile", {
    method: "POST", headers: {
      Authorization: `Bearer ${key}`, "Content-Type": "application/json",
    }, body: JSON.stringify({ entry: `${name}.rs`, files }),
  });
  if (!response.ok) throw new Error(await response.text());
  const bytes = new Uint8Array(await response.arrayBuffer());
  await Deno.writeFile(new URL(`${name}.wasm`, output), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}
await compile("sandbox", [await file("sandbox.rs")]);
await compile("mahjong", [await file("mahjong.rs"), await file("guest-api.rs"), {
  path: "tiles.png", encoding: "base64", content: base64(await Deno.readFile(
    new URL("../../../examples/mahjong/tiles/ExampleRegular.png", root))),
}, {
  path: "bonus.png", encoding: "base64",
  content: base64(await Deno.readFile(new URL("bonus.png", root))),
}]);
await Deno.writeTextFile(new URL("frame.html", output), `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
  <title>Rust project output</title>
</head>
<body>
  <noscript>This application requires JavaScript to start WebAssembly.</noscript>
  <script type="module">${bridge}</script>
</body>
</html>
`);
await Deno.writeTextFile(new URL("index.html", output), `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Rust Mahjong container development</title>
  <style>html,body,iframe{margin:0;width:100%;height:100%;border:0}body{background:#102e29}pre{color:#fff}</style>
</head>
<body>
  <iframe title="Rust Mahjong output" sandbox="allow-scripts"></iframe>
  <script type="module">
    const frame = document.querySelector("iframe");
    const channel = new MessageChannel();
    channel.port1.onmessage = ({data}) => {
      if (data.error) { const pre = document.createElement("pre");
        pre.textContent = data.error; document.body.prepend(pre); }
    };
    const [host, input] = await Promise.all(["sandbox", "mahjong"].map(
      name => fetch("./" + name + ".wasm").then(r => r.arrayBuffer())));
    frame.onload = () => frame.contentWindow.postMessage(
      {host, input}, "*", [channel.port2]);
    frame.src = "./frame.html";
  </script>
</body>
</html>
`);
