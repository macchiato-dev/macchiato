// Only immutable executable assets get precompressed. HTML remains available
// to the document renderer, and user/API responses never enter this path.
export const compressibleArtifact = /(?:^|\/)resources-site\/[^/]+\.(?:wasm|bin|js)$/;

export async function withCompressedArtifacts(artifactSet) {
  const files = new Map(artifactSet.files);
  const artifacts = { ...artifactSet.manifest.artifacts };
  for (const [path, bytes] of artifactSet.files) {
    if (!compressibleArtifact.test(path) || bytes.byteLength < 1024) continue;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    if (compressed.byteLength >= bytes.byteLength) continue;
    const key = `${path}.gz`;
    files.set(key, compressed);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", compressed));
    artifacts[key] = { bytes: compressed.byteLength,
      sha256: Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("") };
  }
  return Object.freeze({ ...artifactSet, files, manifest: Object.freeze({
    ...artifactSet.manifest, files: [...files.keys()], artifacts,
  }) });
}

// An explicit gzip refusal wins over a wildcard. Malformed weights are not
// treated as permission to send a representation the client cannot decode.
export function acceptsGzip(value) {
  let wildcard = false;
  for (const entry of (value || "").toLowerCase().split(",")) {
    const [name, ...parameters] = entry.trim().split(";").map(part => part.trim());
    if (name !== "gzip" && name !== "*") continue;
    const weight = parameters.length ? /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.exec(parameters[0]) : null;
    const allowed = !parameters.length || parameters.length === 1 && weight !== null && Number(weight[1]) > 0;
    if (name === "gzip") return allowed;
    wildcard = allowed;
  }
  return wildcard;
}
