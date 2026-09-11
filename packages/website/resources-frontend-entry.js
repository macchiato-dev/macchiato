// This is the Resources browser application. Build tooling bundles and lowers
// it to MicroQuickJS bytecode; the browser loads only the host controller.
import "./resources-frontend-platform.js";
import "../command-palette-use/src/client.js";
import "../theme-use/src/client.js";
import "../user-menu-use/src/client.js";
import "./resources-project-bootstrap.js";
import "./public-projects-client.js";
import { mountContentNameFields } from "./content-name-fields.js";

// Project form behavior belongs to its editor child; ordinary account forms
// must work without creating that child or loading CodeMirror.
if (!document.querySelector("[data-project-editor]")) mountContentNameFields();
