const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "../src");

function loadModule(relative, modules = {}) {
  const filename = path.join(root, relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  const loader = name => name === "server-only" ? {} : name in modules ? modules[name] :
    name.startsWith("@/") ? loadModule(name.slice(2) + ".ts", modules) : name.startsWith(".") ? loadModule(path.join(path.dirname(relative), name + ".ts"), modules) : require(name);
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports, require: loader, process, Buffer, URL,
    AbortSignal, Response, Request, fetch: modules.fetch ?? fetch, console,
  }, { filename });
  return module.exports;
}

module.exports = { loadModule };
