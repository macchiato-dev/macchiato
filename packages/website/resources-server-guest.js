var pending = null;

function queryValue(value) {
  var input = String(value || "form");
  var output = "";
  for (var index = 0; index < input.length; index++) {
    var code = input.charCodeAt(index);
    var safe = code >= 48 && code <= 57 || code >= 65 && code <= 90 ||
      code >= 97 && code <= 122 || code === 45 || code === 95;
    output += safe ? input.charAt(index) : "%" + ("0" + code.toString(16)).slice(-2);
  }
  return output;
}

function projectFormErrorLocation(state, field) {
  var target = state.operation === "project.create" ? "/projects/new" :
    state.referer || "/projects";
  return target + "?error=" + queryValue(field);
}

function projectError(field, message) {
  var status = field === "snapshot" ? 422 : field === "request_size" ? 413 :
    field === "request_encoding" ? 415 :
    field === "request_origin" || field === "request_token" ? 403 : 400;
  return json(status, '{"error":' + jsonString(field || "invalid") +
    ',"message":' + jsonString(message || "project request is invalid") + "}");
}

function formValues(body) {
  var result = {};
  var pairs = String(body).split("&");
  for (var index = 0; index < pairs.length; index++) {
    if (!pairs[index]) continue;
    var separator = pairs[index].indexOf("=");
    var key = separator < 0 ? pairs[index] : pairs[index].slice(0, separator);
    var value = separator < 0 ? "" : pairs[index].slice(separator + 1);
    key = decodeForm(key);
    value = decodeForm(value);
    if (key === "intent" || key === "csrf" || key === "username" || key === "role" ||
        key === "name" || key === "slug" || key === "description") {
      result[key] = value;
    }
  }
  return result;
}

function decodePercentBytes(bytes) {
  var output = "";
  for (var index = 0; index < bytes.length;) {
    var first = bytes[index++];
    if (first < 128) { output += String.fromCharCode(first); continue; }
    var count = first >= 194 && first <= 223 ? 1 : first >= 224 && first <= 239 ? 2 :
      first >= 240 && first <= 244 ? 3 : -1;
    if (count < 0 || index + count > bytes.length) throw new Error("Invalid UTF-8 form value");
    var code = first & (count === 1 ? 31 : count === 2 ? 15 : 7);
    for (var continuation = 0; continuation < count; continuation++) {
      var next = bytes[index++];
      if ((next & 192) !== 128) throw new Error("Invalid UTF-8 form value");
      if (continuation === 0 && ((first === 224 && next < 160) ||
          (first === 237 && next >= 160) || (first === 240 && next < 144) ||
          (first === 244 && next >= 144))) throw new Error("Invalid UTF-8 form value");
      code = (code << 6) | (next & 63);
    }
    if (code <= 65535) output += String.fromCharCode(code);
    else {
      code -= 65536;
      output += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023));
    }
  }
  return output;
}

function decodeForm(value) {
  var output = "";
  var bytes = [];
  for (var index = 0; index < value.length; index++) {
    var character = value.charAt(index);
    if (character === "+") { output += decodePercentBytes(bytes) + " "; bytes = []; }
    else if (character === "%") {
      if (index + 2 >= value.length) throw new Error("Truncated form escape");
      var byte = parseInt(value.slice(index + 1, index + 3), 16);
      if (!(byte >= 0 && byte <= 255)) throw new Error("Invalid form escape");
      bytes.push(byte);
      index += 2;
    } else {
      output += decodePercentBytes(bytes) + character;
      bytes = [];
    }
  }
  return output + decodePercentBytes(bytes);
}

function trimmedText(value, minimum, maximum) {
  var result = String(value || "").trim();
  return result.length >= minimum && result.length <= maximum ? result : null;
}

function namespaceName(value) {
  var name = String(value || "").trim().toLowerCase();
  if (name.length < 4 || name.length > 63 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return null;
  var reserved = ["admin", "administrator", "api", "auth", "blog", "docs", "help", "login",
    "logout", "organizations", "projects", "root", "security", "settings", "signup", "support",
    "system", "try", "www"];
  for (var index = 0; index < reserved.length; index++) if (reserved[index] === name) return null;
  return name;
}

function versionsJson(rows) {
  var output = '{"versions":[';
  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    if (index) output += ",";
    output += '{"sequence":' + row[0] + ',"reason":' + jsonString(row[1]) +
      ',"createdAt":' + row[2] + ',"title":' + jsonString(row[3] || "") +
      ',"savedAt":' + (row[4] === null ? "null" : row[4]) +
      ',"latest":' + (row[5] ? "true" : "false") + "}";
  }
  return output + "]}";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fileIndex(files, path) {
  for (var index = 0; index < files.length; index++) {
    if (files[index].path === path) return index;
  }
  return -1;
}

function applyPatch(snapshot, patch) {
  if (!patch || patch.version !== 1 || !(patch.files instanceof Array) ||
      !(patch.config instanceof Array)) throw new Error("Invalid project patch");
  var files = snapshot.files;
  for (var index = 0; index < patch.files.length; index++) {
    var operation = patch.files[index];
    var at = fileIndex(files, operation.path);
    if (operation.op === "add") {
      if (at !== -1) throw new Error("Project patch add mismatch");
      files.push({ path: operation.path, content: String(operation.content || "") });
    } else if (operation.op === "delete") {
      if (at === -1 || files[at].content !== operation.before) throw new Error("Project patch delete mismatch");
      files.splice(at, 1);
    } else if (operation.op === "splice") {
      if (at === -1) throw new Error("Project patch splice target is missing");
      var content = files[at].content;
      if (content.slice(operation.start, operation.start + operation.remove.length) !== operation.remove) {
        throw new Error("Project patch splice mismatch");
      }
      files[at].content = content.slice(0, operation.start) + operation.insert +
        content.slice(operation.start + operation.remove.length);
    } else throw new Error("Unsupported project file operation");
  }
  for (var configIndex = 0; configIndex < patch.config.length; configIndex++) {
    var configOperation = patch.config[configIndex];
    var parent = snapshot.config;
    for (var pathIndex = 0; pathIndex < configOperation.path.length - 1; pathIndex++) {
      parent = parent[configOperation.path[pathIndex]];
      if (!parent || typeof parent !== "object") throw new Error("Configuration patch path is missing");
    }
    var key = configOperation.path[configOperation.path.length - 1];
    if (configOperation.op === "delete") delete parent[key];
    else if (configOperation.op === "set") parent[key] = clone(configOperation.value);
    else throw new Error("Unsupported configuration operation");
  }
  files.sort(function (left, right) { return left.path < right.path ? -1 : left.path > right.path ? 1 : 0; });
  return snapshot;
}

function serverHandle(input) {
  if (input[0] === "document.get" || input[0] === "document.head") {
    pending = { kind: "document-session", path: input[2] };
    return [2, "session", "current", [input[5]]];
  }
  if (String(input[0]).indexOf("document.") === 0) {
    return [405, [["allow", "GET, HEAD"], ["cache-control", "no-store"],
      ["content-type", "text/plain; charset=utf-8"]], "Method not allowed"];
  }
  if (input[0] === "session.logout") {
    pending = { kind: "logout" };
    return [2, "session", "sign-out", []];
  }
  if (input[0] === "health") {
    pending = { kind: "health" };
    return [2, "sql", "system.ready", []];
  }
  if (input[0] === "project.versions") {
    pending = { kind: "session", operation: "versions", projectId: input[4][0] };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "project.version") {
    pending = { kind: "session", operation: "version", projectId: input[4][0],
      sequence: parseInt(input[4][1], 10) };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "project.workspace") {
    pending = { kind: "session", operation: "workspace",
      namespace: input[4][0], slug: input[4][1] };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "project.snapshot" || input[0] === "project.restore") {
    if (input[6].split(";", 1)[0] !== "application/json") {
      return projectError("request_encoding", "JSON is required");
    }
    if (input[7] !== input[8]) {
      return projectError("request_origin", "invalid request origin");
    }
    if (input[12] && parseInt(input[12], 10) > 72 * 1024 * 1024) {
      return projectError("request_size", "project update is too large");
    }
    pending = { kind: "session", operation: input[0], projectId: input[4][0],
      sequence: input[4][1] ? parseInt(input[4][1], 10) : 0,
      csrf: input[11] || "" };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "project.create" || input[0] === "project.action") {
    if (input[6].split(";", 1)[0] !== "application/x-www-form-urlencoded") {
      return text(415, "Form encoding is required");
    }
    if (input[7] !== input[8]) return text(403, "Invalid request origin");
    if (input[12] && parseInt(input[12], 10) > 70 * 1024 * 1024) {
      return redirect((input[0] === "project.create" ? "/projects/new" : input[13]) +
        "?error=form");
    }
    pending = { kind: "session", operation: input[0], projectId: input[4][0] || "",
      referer: input[13] || "/projects" };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "notification.action") {
    if (input[6].split(";", 1)[0] !== "application/x-www-form-urlencoded") {
      return text(415, "Form encoding is required");
    }
    if (input[7] !== input[8]) return text(403, "Invalid request origin");
    var form;
    try { form = formValues(input[9]); }
    catch (formError) { return text(400, "Invalid form encoding"); }
    if (form.intent !== "read" && form.intent !== "delete" && form.intent !== "accept") {
      return text(400, "Invalid notification action");
    }
    pending = { kind: "session", operation: "notification", notificationId: input[4][0],
      intent: form.intent, csrf: form.csrf || "", now: input[10] };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "organization.invite" || input[0] === "organization.role") {
    if (input[6].split(";", 1)[0] !== "application/x-www-form-urlencoded") {
      return text(415, "Form encoding is required");
    }
    if (input[7] !== input[8]) return text(403, "Invalid request origin");
    var organizationForm;
    try { organizationForm = formValues(input[9]); }
    catch (organizationFormError) { return text(400, "Invalid form encoding"); }
    if (organizationForm.role !== "member" && organizationForm.role !== "admin") {
      return redirect("/" + input[4][0] + "?error=role");
    }
    var username = input[0] === "organization.invite" ? namespaceName(organizationForm.username) : null;
    if (input[0] === "organization.invite" && !username) {
      return redirect("/" + input[4][0] + "?error=username");
    }
    pending = { kind: "session", operation: input[0], slug: input[4][0],
      memberId: input[4][1] || "", username: username, role: organizationForm.role,
      csrf: organizationForm.csrf || "", now: input[10] };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "profile.update") {
    if (input[6].split(";", 1)[0] !== "application/x-www-form-urlencoded") {
      return text(415, "Form encoding is required");
    }
    if (input[7] !== input[8]) return text(403, "Invalid request origin");
    var profileForm;
    try { profileForm = formValues(input[9]); }
    catch (profileFormError) { return text(400, "Invalid form encoding"); }
    var profileUsername = namespaceName(profileForm.username);
    if (!profileUsername) return redirect("/profile?error=username");
    pending = { kind: "session", operation: "profile.update", username: profileUsername,
      csrf: profileForm.csrf || "", cookie: input[5], now: input[10] };
    return [2, "session", "current", [input[5]]];
  }
  if (input[0] === "organization.create") {
    if (input[6].split(";", 1)[0] !== "application/x-www-form-urlencoded") {
      return text(415, "Form encoding is required");
    }
    if (input[7] !== input[8]) return text(403, "Invalid request origin");
    var createOrganizationForm;
    try { createOrganizationForm = formValues(input[9]); }
    catch (createOrganizationFormError) { return text(400, "Invalid form encoding"); }
    var createOrganizationSlug = namespaceName(createOrganizationForm.slug);
    var createOrganizationName = trimmedText(createOrganizationForm.name, 4, 80);
    var createOrganizationDescription = trimmedText(createOrganizationForm.description, 0, 500);
    if (!createOrganizationSlug) return redirect("/organizations/new?error=organization_name");
    if (!createOrganizationName) return redirect("/organizations/new?error=name");
    if (createOrganizationDescription === null) {
      return redirect("/organizations/new?error=description");
    }
    pending = { kind: "session", operation: "organization.create",
      slug: createOrganizationSlug, name: createOrganizationName,
      description: createOrganizationDescription, csrf: createOrganizationForm.csrf || "",
      now: input[10] };
    return [2, "session", "current", [input[5]]];
  }
  return text(404, "Not found");
}

function serverResume(ok, result) {
  if (!pending) return text(500, "Server machine state error");
  if (pending.kind === "health") {
    pending = null;
    if (!ok) return text(503, "Database unavailable");
    return result[0][0] === 1 ? text(200, "OK") : text(503, "Database unavailable");
  }
  if (pending.kind === "document-session") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    var documentPath = pending.path;
    if (documentPath === "/dashboard") {
      pending = null;
      return [302, [["cache-control", "no-store"], ["location", "/"]], ""];
    }
    if ((documentPath === "/projects" || documentPath === "/projects/new" ||
        documentPath === "/organizations/new" || documentPath === "/profile" ||
        documentPath === "/auth/github/link" || documentPath === "/auth/gitlab/link") &&
        result === null) {
      pending = null;
      return [302, [["cache-control", "private, no-store"], ["location", "/login"]], ""];
    }
    pending = { kind: "document" };
    return [2, "document", "handle", []];
  }
  if (pending.kind === "document") {
    pending = null;
    if (!ok || !(result instanceof Array) || !(result[1] instanceof Array)) {
      return text(503, "Document unavailable");
    }
    return [result[0], result[1], "\u001edocument-response"];
  }
  if (pending.kind === "logout") {
    pending = null;
    return ok ? redirectWithCookie("/", result) : text(503, "Session unavailable");
  }
  if (pending.kind === "session") {
    if (!ok) { pending = null; return json(503, '{"error":"session_unavailable"}'); }
    if (pending.operation === "workspace") {
      pending = { kind: "workspace-project", namespace: pending.namespace,
        slug: pending.slug, userId: result === null ? "" : result[0] };
      return [2, "project", "lookup", [pending.namespace, pending.slug, pending.userId]];
    }
    if (result === null) {
      var formLogin = pending.operation === "project.create" || pending.operation === "project.action";
      pending = null;
      return formLogin ? redirect("/login") : json(401, '{"error":"authentication_required"}');
    }
    if (pending.operation === "project.create" || pending.operation === "project.action") {
      pending = { kind: "project-form", operation: pending.operation,
        projectId: pending.projectId, referer: pending.referer,
        userId: result[0], userSlug: result[1] || "" };
      return [2, "project", "form", []];
    }
    if (pending.operation === "notification") {
      pending = { kind: "notification-csrf", notificationId: pending.notificationId,
        intent: pending.intent, csrf: pending.csrf, now: pending.now, userId: result[0] };
      return [2, "session", "csrf", [pending.csrf, pending.userId, "notifications"]];
    }
    if (pending.operation === "organization.invite" || pending.operation === "organization.role") {
      pending = { kind: "organization-csrf", operation: pending.operation, slug: pending.slug,
        memberId: pending.memberId, username: pending.username, role: pending.role,
        csrf: pending.csrf, now: pending.now, userId: result[0] };
      return [2, "session", "csrf", [pending.csrf, pending.userId,
        "organization:" + pending.slug]];
    }
    if (pending.operation === "profile.update") {
      pending = { kind: "profile-csrf", username: pending.username, csrf: pending.csrf,
        cookie: pending.cookie, now: pending.now, userId: result[0] };
      return [2, "session", "csrf", [pending.csrf, pending.userId, "profile"]];
    }
    if (pending.operation === "organization.create") {
      pending = { kind: "organization-create-csrf", slug: pending.slug, name: pending.name,
        description: pending.description, csrf: pending.csrf, now: pending.now,
        userId: result[0] };
      return [2, "session", "csrf", [pending.csrf, pending.userId, "/organizations"]];
    }
    if (pending.operation === "project.snapshot" || pending.operation === "project.restore") {
      pending = { kind: "project-csrf", operation: pending.operation,
        projectId: pending.projectId, sequence: pending.sequence, csrf: pending.csrf,
        userId: result[0] };
      return [2, "session", "csrf", [pending.csrf, pending.userId,
        "project:" + pending.projectId]];
    }
    if (pending.operation === "versions") {
      pending = { kind: "versions", projectId: pending.projectId };
      return [2, "sql", "content.versions", [pending.projectId, result[0]]];
    }
    pending = { kind: "version-latest", projectId: pending.projectId,
      sequence: pending.sequence, userId: result[0] };
    return [2, "sql", "content.latest-version", [pending.projectId, pending.userId]];
  }
  if (pending.kind === "workspace-project") {
    if (!ok) { pending = null; return json(503, '{"error":"content_unavailable"}'); }
    if (!result[0] || !result[1]) { pending = null; return json(404, '{"error":"not_found"}'); }
    var workspaceOwner = pending.userId && pending.userId === result[2];
    if (!workspaceOwner && result[3] !== "public") {
      pending = null;
      return json(404, '{"error":"not_found"}');
    }
    var workspaceOperation = workspaceOwner ? "workspace-owned" : "workspace-public";
    var workspaceInput = workspaceOwner ? [pending.namespace, pending.slug, pending.userId] :
      [pending.namespace, pending.slug];
    pending = { kind: "workspace-result", owner: Boolean(workspaceOwner) };
    return [2, "project", workspaceOperation, workspaceInput];
  }
  if (pending.kind === "workspace-result") {
    if (!ok) { pending = null; return json(503, '{"error":"content_unavailable"}'); }
    if (!result[0] || !result[1]) { pending = null; return json(404, '{"error":"not_found"}'); }
    var workspaceCache = pending.owner ? "private, no-store" : "public, max-age=30";
    pending = null;
    return [200, [["cache-control", workspaceCache],
      ["content-type", "application/json; charset=utf-8"]], "\u001eproject-response"];
  }
  if (pending.kind === "project-form") {
    if (!ok) { pending = null; return text(503, "Project form unavailable"); }
    if (!result[0]) {
      var parseLocation = projectFormErrorLocation(pending, result[1]);
      pending = null;
      return redirect(parseLocation);
    }
    var formIntent = result[1] || "save";
    if (pending.operation === "project.create" && formIntent !== "save") {
      var createIntentLocation = projectFormErrorLocation(pending, "form");
      pending = null;
      return redirect(createIntentLocation);
    }
    if (pending.operation === "project.action" && formIntent !== "save" &&
        formIntent !== "delete" && formIntent !== "revert") {
      var actionIntentLocation = projectFormErrorLocation(pending, "form");
      pending = null;
      return redirect(actionIntentLocation);
    }
    pending = { kind: "project-form-csrf", operation: pending.operation,
      projectId: pending.projectId, referer: pending.referer,
      userId: pending.userId, userSlug: pending.userSlug, intent: formIntent };
    return [2, "session", "csrf", [result[2] || "", pending.userId,
      pending.operation === "project.create" ? "/projects" : "project:" + pending.projectId]];
  }
  if (pending.kind === "project-form-csrf") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    if (!result) {
      var csrfLocation = projectFormErrorLocation(pending, "form");
      pending = null;
      return redirect(csrfLocation);
    }
    var projectDeviceOperation = pending.operation === "project.create" ? "create" : pending.intent;
    if (projectDeviceOperation === "save") projectDeviceOperation = "update";
    var projectDeviceInput = projectDeviceOperation === "create" ?
      [pending.userId, pending.userSlug] : projectDeviceOperation === "update" ?
        [pending.userId, pending.projectId, pending.userSlug] :
        [pending.userId, pending.projectId];
    pending.kind = "project-form-result";
    pending.deviceOperation = projectDeviceOperation;
    return [2, "project", projectDeviceOperation, projectDeviceInput];
  }
  if (pending.kind === "project-form-result") {
    if (!ok) {
      var failedProjectOperation = pending.deviceOperation;
      pending = null;
      return text(503, "Project " + failedProjectOperation + " unavailable");
    }
    if (!result[0]) {
      var validationLocation = projectFormErrorLocation(pending, result[1]);
      pending = null;
      return redirect(validationLocation);
    }
    if (!result[1]) { pending = null; return text(404, "Not found"); }
    if (pending.deviceOperation === "create") {
      var createdLocation = "/" + result[1] + "/" + result[2];
      pending = null;
      return redirect(createdLocation);
    }
    if (pending.deviceOperation === "delete") { pending = null; return redirect("/projects"); }
    if (pending.deviceOperation === "revert") {
      var revertLocation = pending.referer;
      pending = null;
      return redirect(revertLocation);
    }
    if (pending.deviceOperation === "update") {
      pending.location = "/" + result[1] + "/" + result[2];
      pending.deviceOperation = "save";
      return [2, "project", "save", [pending.userId, pending.projectId]];
    }
    if (pending.deviceOperation === "save") {
      pending.deviceOperation = "publish";
      return [2, "project", "publish", [pending.userId, pending.projectId]];
    }
    if (pending.deviceOperation === "publish") {
      var publishedLocation = pending.location;
      pending = null;
      return redirect(publishedLocation);
    }
    pending = null;
    return text(500, "Project update state error");
  }
  if (pending.kind === "project-csrf") {
    if (!ok) { pending = null; return json(503, '{"error":"session_unavailable"}'); }
    if (!result) {
      pending = null;
      return projectError("request_token",
        "save authorization expired; reload the page and try again");
    }
    var projectOperation = pending.operation === "project.snapshot" ? "save" : "restore";
    var projectInput = projectOperation === "save" ? [pending.userId, pending.projectId] :
      [pending.userId, pending.projectId, pending.sequence];
    pending = { kind: "project-result" };
    return [2, "project", projectOperation, projectInput];
  }
  if (pending.kind === "project-result") {
    pending = null;
    if (!ok) return json(503, '{"error":"content_unavailable"}');
    if (!result[0]) return projectError(result[1], result[2]);
    if (!result[1]) return json(404, '{"error":"not_found"}');
    return [200, [["cache-control", "no-store"],
      ["content-type", "application/json; charset=utf-8"]], "\u001eproject-response"];
  }
  if (pending.kind === "notification-csrf") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    if (!result) { pending = null; return text(403, "Invalid form token"); }
    if (pending.intent === "read") {
      var readInput = [pending.now, pending.notificationId, pending.userId];
      pending = { kind: "notification-result", location: "/" };
      return [2, "sql", "organization.mark-notification-read", readInput];
    }
    if (pending.intent === "delete") {
      var deleteId = pending.notificationId;
      var deleteUser = pending.userId;
      pending = { kind: "notification-result", location: "/" };
      return [2, "sql", "batch", [
        ["organization.delete-pending-invitation", [deleteId, deleteUser]],
        ["organization.delete-notification", [deleteId, deleteUser]]
      ]];
    }
    pending = { kind: "notification-invitation", notificationId: pending.notificationId,
      userId: pending.userId, now: pending.now };
    return [2, "sql", "organization.invitation", [pending.notificationId, pending.userId]];
  }
  if (pending.kind === "organization-csrf") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    if (!result) {
      var csrfSlug = pending.slug;
      pending = null;
      return redirect("/" + csrfSlug + "?error=access");
    }
    pending = { kind: "organization-managed", operation: pending.operation, slug: pending.slug,
      memberId: pending.memberId, username: pending.username, role: pending.role,
      now: pending.now, userId: pending.userId };
    return [2, "sql", "organization.managed",
      [pending.userId, pending.userId, pending.slug, pending.userId]];
  }
  if (pending.kind === "profile-csrf") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    if (!result) { pending = null; return redirect("/profile?error=username"); }
    pending.kind = "profile-organization";
    return [2, "sql", "account.organization-slug-exists", [pending.username]];
  }
  if (pending.kind === "organization-create-csrf") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    if (!result) { pending = null; return redirect("/organizations/new?error=form"); }
    pending.kind = "organization-create-username";
    return [2, "sql", "content.username-exists", [pending.slug]];
  }
  if (pending.kind === "organization-create-username") {
    if (!ok) { pending = null; return text(503, "Organization unavailable"); }
    if (result.length) {
      pending = null;
      return redirect("/organizations/new?error=organization_taken");
    }
    pending.kind = "organization-create-id";
    return [2, "random", "uuid", []];
  }
  if (pending.kind === "organization-create-id") {
    if (!ok) { pending = null; return text(503, "Random source unavailable"); }
    pending.kind = "organization-create-result";
    return [2, "sql", "content.insert-organization", [result, pending.userId,
      pending.slug, pending.name, pending.description, pending.now, pending.now]];
  }
  if (pending.kind === "organization-create-result") {
    if (ok && result[0]) { pending = null; return redirect("/"); }
    var organizationCreateError = String(result || "");
    pending = null;
    return redirect("/organizations/new?error=" +
      (organizationCreateError.indexOf("resource_organizations_owner_limit") >= 0 ?
        "organization_limit" : "organization_taken"));
  }
  if (pending.kind === "profile-organization") {
    if (!ok) { pending = null; return text(503, "Account unavailable"); }
    if (result.length) { pending = null; return redirect("/profile?error=username_taken"); }
    pending.kind = "profile-update";
    return [2, "sql", "batch", [
      ["account.update-username", [pending.username, pending.now, pending.userId]],
      ["account.update-project-namespace", [pending.username, pending.now, pending.userId]]
    ]];
  }
  if (pending.kind === "profile-update") {
    if (!ok || !result[0]) { pending = null; return redirect("/profile?error=username_taken"); }
    pending.kind = "profile-account";
    return [2, "sql", "account.get", [pending.userId]];
  }
  if (pending.kind === "profile-account") {
    if (!ok) { pending = null; return text(503, "Account unavailable"); }
    if (!result.length) { pending = null; return text(404, "Not found"); }
    pending.kind = "profile-cookie";
    return [2, "session", "refresh-username", [pending.cookie, pending.userId,
      pending.username]];
  }
  if (pending.kind === "profile-cookie") {
    if (!ok) { pending = null; return text(503, "Session unavailable"); }
    pending = null;
    return redirectWithCookie("/profile", result);
  }
  if (pending.kind === "organization-managed") {
    if (!ok) { pending = null; return text(503, "Organization unavailable"); }
    if (!result.length) {
      var accessSlug = pending.slug;
      pending = null;
      return redirect("/" + accessSlug + "?error=access");
    }
    var managed = result[0];
    if (pending.operation === "organization.role") {
      var roleSlug = pending.slug;
      var roleInput = [pending.role, pending.now, managed[0], pending.memberId];
      pending = { kind: "organization-result", location: "/" + roleSlug,
        errorLocation: "/" + roleSlug + "?error=role" };
      return [2, "sql", "organization.change-role", roleInput];
    }
    pending = { kind: "organization-user", slug: pending.slug, username: pending.username,
      role: pending.role, now: pending.now, userId: pending.userId,
      organizationId: managed[0], ownerId: managed[2] };
    return [2, "sql", "organization.user-by-username", [pending.username]];
  }
  if (pending.kind === "organization-user") {
    if (!ok) { pending = null; return text(503, "Organization unavailable"); }
    if (!result.length || result[0][0] === pending.ownerId) {
      var userSlug = pending.slug;
      pending = null;
      return redirect("/" + userSlug + "?error=username");
    }
    pending = { kind: "organization-existing-member", slug: pending.slug,
      role: pending.role, now: pending.now, userId: pending.userId,
      organizationId: pending.organizationId, targetId: result[0][0] };
    return [2, "sql", "organization.existing-member", [pending.organizationId, pending.targetId]];
  }
  if (pending.kind === "organization-existing-member") {
    if (!ok) { pending = null; return text(503, "Organization unavailable"); }
    if (result.length) {
      var memberSlug = pending.slug;
      pending = null;
      return redirect("/" + memberSlug + "?error=username");
    }
    if (pending.role === "admin") {
      pending.kind = "organization-existing-admin";
      return [2, "sql", "organization.existing-admin", [pending.organizationId]];
    }
    pending.kind = "organization-invitation-id";
    return [2, "random", "uuid", []];
  }
  if (pending.kind === "organization-existing-admin") {
    if (!ok) { pending = null; return text(503, "Organization unavailable"); }
    if (result.length) {
      var adminSlug = pending.slug;
      pending = null;
      return redirect("/" + adminSlug + "?error=role");
    }
    pending.kind = "organization-invitation-id";
    return [2, "random", "uuid", []];
  }
  if (pending.kind === "organization-invitation-id") {
    if (!ok) { pending = null; return text(503, "Random source unavailable"); }
    pending.invitationId = result;
    pending.kind = "organization-notification-id";
    return [2, "random", "uuid", []];
  }
  if (pending.kind === "organization-notification-id") {
    if (!ok) { pending = null; return text(503, "Random source unavailable"); }
    var inviteSlug = pending.slug;
    var inviteBatch = [
      ["organization.insert-invitation", [pending.invitationId, pending.organizationId,
        pending.userId, pending.targetId, pending.role, pending.now, pending.now]],
      ["organization.insert-notification", [result, pending.targetId, pending.invitationId, pending.now]]
    ];
    pending = { kind: "organization-result", location: "/" + inviteSlug,
      errorLocation: "/" + inviteSlug + "?error=role" };
    return [2, "sql", "batch", inviteBatch];
  }
  if (pending.kind === "organization-result") {
    var organizationLocation = ok ? pending.location : pending.errorLocation;
    pending = null;
    return redirect(organizationLocation);
  }
  if (pending.kind === "notification-invitation") {
    if (!ok) { pending = null; return text(503, "Notifications unavailable"); }
    if (!result.length || result[0][3] !== "pending") { pending = null; return redirect("/"); }
    var invitation = result[0];
    var notificationId = pending.notificationId;
    var userId = pending.userId;
    var timestamp = pending.now;
    pending = { kind: "notification-result", location: "/" + invitation[4] };
    return [2, "sql", "batch", [
      ["organization.insert-member", [invitation[1], userId, invitation[2], timestamp, timestamp]],
      ["organization.accept-invitation", [timestamp, invitation[0]]],
      ["organization.mark-notification-read", [timestamp, notificationId, userId]]
    ]];
  }
  if (pending.kind === "notification-result") {
    var location = pending.location;
    pending = null;
    return ok ? redirect(location) : text(503, "Notification update unavailable");
  }
  if (pending.kind === "versions") {
    pending = null;
    return ok ? json(200, versionsJson(result)) : json(503, '{"error":"content_unavailable"}');
  }
  if (pending.kind === "version-latest") {
    if (!ok || !result.length) { pending = null; return json(ok ? 404 : 503,
      ok ? '{"error":"not_found"}' : '{"error":"content_unavailable"}'); }
    if (result[0][0] === pending.sequence) {
      var latestJson = result[0][1];
      pending = null;
      return json(200, '{"snapshot":' + latestJson + "}");
    }
    pending = { kind: "version-patches", projectId: pending.projectId,
      sequence: pending.sequence, userId: pending.userId };
    return [2, "sql", "content.version-patches",
      [pending.projectId, pending.userId, pending.sequence]];
  }
  if (pending.kind === "version-patches") {
    var target = pending.sequence;
    pending = null;
    if (!ok) return json(503, '{"error":"content_unavailable"}');
    if (!result.length || result[result.length - 1][0] !== target) {
      return json(404, '{"error":"not_found"}');
    }
    var snapshot = { files: [], config: {} };
    for (var patchIndex = 0; patchIndex < result.length; patchIndex++) {
      snapshot = applyPatch(snapshot, JSON.parse(result[patchIndex][1]));
    }
    return json(200, '{"snapshot":' + JSON.stringify(snapshot) + "}");
  }
  pending = null;
  return text(500, "Server machine state error");
}
