#!/usr/bin/env node
import { detectAppConfiguration } from "./detect.js";

const result = await detectAppConfiguration(process.argv[2] || ".");
console.log(JSON.stringify(result, null, 2));
if (!result.runnable) process.exitCode = 1;
