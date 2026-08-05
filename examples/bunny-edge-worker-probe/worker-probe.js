import * as BunnySDK from "@bunny.net/edgescript-sdk";

function errorRecord(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
  };
}

async function probeWorker() {
  const report = {
    workerGlobal: typeof Worker,
    dataModuleWorker: false,
    roundTrip: false,
    terminated: false,
  };
  if (typeof Worker !== "function") return report;

  let worker;
  let timeout;
  try {
    const source = `
      self.onmessage = (event) => {
        self.postMessage({
          reply: event.data.value + 1,
          workerGlobal: typeof Worker,
          hasDeno: typeof Deno === "object"
        });
      };
    `;
    const url = `data:application/javascript,${encodeURIComponent(source)}`;
    worker = new Worker(url, { type: "module", name: "bunny-worker-probe" });
    report.dataModuleWorker = true;
    const message = await Promise.race([
      new Promise((resolve, reject) => {
        worker.onmessage = (event) => resolve(event.data);
        worker.onerror = (event) => reject(event.error || new Error(event.message || "Worker error"));
        worker.postMessage({ value: 41 });
      }),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Worker message timed out after 2000ms")), 2_000);
      }),
    ]);
    report.message = message;
    report.roundTrip = message?.reply === 42;
  } catch (error) {
    report.error = errorRecord(error);
  } finally {
    clearTimeout(timeout);
    if (worker) {
      try {
        worker.terminate();
        report.terminated = true;
      } catch (error) {
        report.terminationError = errorRecord(error);
      }
    }
  }
  return report;
}

BunnySDK.net.http.serve(async () => Response.json(await probeWorker(), {
  headers: { "cache-control": "no-store" },
}));
