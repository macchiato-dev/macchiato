export function nodeResponseHeaders(headers) {
  const result = {};
  for (const [name, value] of headers) {
    if (name.toLowerCase() !== "set-cookie") result[name] = value;
  }
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (cookies.length) result["set-cookie"] = cookies;
  else if (headers.has("set-cookie")) result["set-cookie"] = headers.get("set-cookie");
  return result;
}
