import { getQuickJS } from "@jitl/quickjs-singlefile-browser-release-sync";

const QuickJS = await getQuickJS();
const runtime = QuickJS.newRuntime();
const context = runtime.newContext();
const result = context.evalCode("1 + 1");
if (result.error) {
  console.log("error:", context.dump(result.error));
  result.error.dispose();
} else {
  console.log("result:", context.dump(result.value));
  result.value.dispose();
}
context.dispose();
runtime.dispose();
