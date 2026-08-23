FROM node:24-bookworm

WORKDIR /workspace
COPY . .
RUN npm ci \
 && node dev/wasm-web-runtimes/examples/codemirror/build.js

CMD ["sh", "-lc", "cp -R dev/wasm-web-runtimes/examples/codemirror/generated/. /output/"]
