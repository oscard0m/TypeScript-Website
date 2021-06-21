var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./vendor/lzstring.min"], function (require, exports, lzstring_min_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.detectNewImportsToAcquireTypeFor = exports.acquiredTypeDefs = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    const globalishObj = typeof globalThis !== "undefined" ? globalThis : window || {};
    globalishObj.typeDefinitions = {};
    /**
     * Type Defs we've already got, and nulls when something has failed.
     * This is to make sure that it doesn't infinite loop.
     */
    exports.acquiredTypeDefs = globalishObj.typeDefinitions;
    const moduleJSONURL = (name) => 
    // prettier-ignore
    `https://ofcncog2cu-dsn.algolia.net/1/indexes/npm-search/${encodeURIComponent(name)}?attributes=types&x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.27.1&x-algolia-application-id=OFCNCOG2CU&x-algolia-api-key=f54e21fa3a2a0160595bb058179bfb1e`;
    const unpkgURL = (name, path) => {
        if (!name) {
            const actualName = path.substring(0, path.indexOf("/"));
            const actualPath = path.substring(path.indexOf("/") + 1);
            return `https://www.unpkg.com/${encodeURIComponent(actualName)}/${encodeURIComponent(actualPath)}`;
        }
        return `https://www.unpkg.com/${encodeURIComponent(name)}/${encodeURIComponent(path)}`;
    };
    const packageJSONURL = (name) => unpkgURL(name, "package.json");
    const errorMsg = (msg, response, config) => {
        config.logger.error(`${msg} - will not try again in this session`, response.status, response.statusText, response);
    };
    /**
     * Grab any import/requires from inside the code and make a list of
     * its dependencies
     */
    const parseFileForModuleReferences = (sourceCode) => {
        // https://regex101.com/r/Jxa3KX/4
        const requirePattern = /(const|let|var)(.|\n)*? require\(('|")(.*)('|")\);?$/gm;
        // this handle ths 'from' imports  https://regex101.com/r/hdEpzO/4
        const es6Pattern = /(import|export)((?!from)(?!require)(.|\n))*?(from|require\()\s?('|")(.*)('|")\)?;?$/gm;
        // https://regex101.com/r/hdEpzO/8
        const es6ImportOnly = /import\s+?\(?('|")(.*)('|")\)?;?/gm;
        const foundModules = new Set();
        var match;
        while ((match = es6Pattern.exec(sourceCode)) !== null) {
            if (match[6])
                foundModules.add(match[6]);
        }
        while ((match = requirePattern.exec(sourceCode)) !== null) {
            if (match[5])
                foundModules.add(match[5]);
        }
        while ((match = es6ImportOnly.exec(sourceCode)) !== null) {
            if (match[2])
                foundModules.add(match[2]);
        }
        return Array.from(foundModules);
    };
    /** Converts some of the known global imports to node so that we grab the right info */
    const mapModuleNameToModule = (name) => {
        // in node repl:
        // > require("module").builtinModules
        const builtInNodeMods = [
            "assert",
            "async_hooks",
            "buffer",
            "child_process",
            "cluster",
            "console",
            "constants",
            "crypto",
            "dgram",
            "dns",
            "domain",
            "events",
            "fs",
            "fs/promises",
            "http",
            "http2",
            "https",
            "inspector",
            "module",
            "net",
            "os",
            "path",
            "perf_hooks",
            "process",
            "punycode",
            "querystring",
            "readline",
            "repl",
            "stream",
            "string_decoder",
            "sys",
            "timers",
            "tls",
            "trace_events",
            "tty",
            "url",
            "util",
            "v8",
            "vm",
            "wasi",
            "worker_threads",
            "zlib",
        ];
        if (builtInNodeMods.includes(name)) {
            return "node";
        }
        return name;
    };
    //** A really simple version of path.resolve */
    const mapRelativePath = (moduleDeclaration, currentPath) => {
        // https://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
        function absolute(base, relative) {
            if (!base)
                return relative;
            const stack = base.split("/");
            const parts = relative.split("/");
            stack.pop(); // remove current file name (or empty string)
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] == ".")
                    continue;
                if (parts[i] == "..")
                    stack.pop();
                else
                    stack.push(parts[i]);
            }
            return stack.join("/");
        }
        return absolute(currentPath, moduleDeclaration);
    };
    const convertToModuleReferenceID = (outerModule, moduleDeclaration, currentPath) => {
        const modIsScopedPackageOnly = moduleDeclaration.indexOf("@") === 0 && moduleDeclaration.split("/").length === 2;
        const modIsPackageOnly = moduleDeclaration.indexOf("@") === -1 && moduleDeclaration.split("/").length === 1;
        const isPackageRootImport = modIsPackageOnly || modIsScopedPackageOnly;
        if (isPackageRootImport) {
            return moduleDeclaration;
        }
        else {
            return `${outerModule}-${mapRelativePath(moduleDeclaration, currentPath)}`;
        }
    };
    /**
     * Takes an initial module and the path for the root of the typings and grab it and start grabbing its
     * dependencies then add those the to runtime.
     */
    const addModuleToRuntime = (mod, path, config) => __awaiter(void 0, void 0, void 0, function* () {
        const isDeno = path && path.indexOf("https://") === 0;
        let actualMod = mod;
        let actualPath = path;
        if (!mod) {
            actualMod = path.substring(0, path.indexOf("/"));
            actualPath = path.substring(path.indexOf("/") + 1);
        }
        const dtsFileURL = isDeno ? path : unpkgURL(actualMod, actualPath);
        let content = yield getCachedDTSString(config, dtsFileURL);
        if (!content) {
            const isDeno = actualPath && actualPath.indexOf("https://") === 0;
            const dtsFileURL = isDeno ? actualPath : unpkgURL(actualMod, `${actualPath.replace(".d.ts", "")}/index.d.ts`);
            content = yield getCachedDTSString(config, dtsFileURL);
            if (!content) {
                return errorMsg(`Could not get root d.ts file for the module '${actualMod}' at ${actualPath}`, {}, config);
            }
        }
        // Now look and grab dependent modules where you need the
        yield getDependenciesForModule(content, actualMod, actualPath, config);
        if (isDeno) {
            const wrapped = `declare module "${actualPath}" { ${content} }`;
            config.addLibraryToRuntime(wrapped, actualPath);
        }
        else {
            config.addLibraryToRuntime(content, `file:///node_modules/${actualMod}/${actualPath}`);
        }
    });
    /**
     * Takes a module import, then uses both the algolia API and the the package.json to derive
     * the root type def path.
     *
     * @param {string} packageName
     * @returns {Promise<{ mod: string, path: string, packageJSON: any }>}
     */
    const getModuleAndRootDefTypePath = (packageName, config) => __awaiter(void 0, void 0, void 0, function* () {
        const url = moduleJSONURL(packageName);
        const response = yield config.fetcher(url);
        if (!response.ok) {
            return errorMsg(`Could not get Algolia JSON for the module '${packageName}'`, response, config);
        }
        const responseJSON = yield response.json();
        if (!responseJSON) {
            return errorMsg(`Could the Algolia JSON was un-parsable for the module '${packageName}'`, response, config);
        }
        if (!responseJSON.types) {
            return config.logger.log(`There were no types for '${packageName}' - will not try again in this session`);
        }
        if (!responseJSON.types.ts) {
            return config.logger.log(`There were no types for '${packageName}' - will not try again in this session`);
        }
        exports.acquiredTypeDefs[packageName] = responseJSON;
        if (responseJSON.types.ts === "included") {
            const modPackageURL = packageJSONURL(packageName);
            const response = yield config.fetcher(modPackageURL);
            if (!response.ok) {
                return errorMsg(`Could not get Package JSON for the module '${packageName}'`, response, config);
            }
            const responseJSON = yield response.json();
            if (!responseJSON) {
                return errorMsg(`Could not get Package JSON for the module '${packageName}'`, response, config);
            }
            config.addLibraryToRuntime(JSON.stringify(responseJSON, null, "  "), `file:///node_modules/${packageName}/package.json`);
            // Get the path of the root d.ts file
            // non-inferred route
            let rootTypePath = responseJSON.typing || responseJSON.typings || responseJSON.types;
            // package main is custom
            if (!rootTypePath && typeof responseJSON.main === "string" && responseJSON.main.indexOf(".js") > 0) {
                rootTypePath = responseJSON.main.replace(/js$/, "d.ts");
            }
            // Final fallback, to have got here it must have passed in algolia
            if (!rootTypePath) {
                rootTypePath = "index.d.ts";
            }
            return { mod: packageName, path: rootTypePath, packageJSON: responseJSON };
        }
        else if (responseJSON.types.ts === "definitely-typed") {
            return { mod: responseJSON.types.definitelyTyped, path: "index.d.ts", packageJSON: responseJSON };
        }
        else {
            throw "This shouldn't happen";
        }
    });
    const getCachedDTSString = (config, url) => __awaiter(void 0, void 0, void 0, function* () {
        const cached = localStorage.getItem(url);
        if (cached) {
            const [dateString, text] = cached.split("-=-^-=-");
            const cachedDate = new Date(dateString);
            const now = new Date();
            const cacheTimeout = 604800000; // 1 week
            // const cacheTimeout = 60000 // 1 min
            if (now.getTime() - cachedDate.getTime() < cacheTimeout) {
                return lzstring_min_1.default.decompressFromUTF16(text);
            }
            else {
                config.logger.log("Skipping cache for ", url);
            }
        }
        const response = yield config.fetcher(url);
        if (!response.ok) {
            return errorMsg(`Could not get DTS response for the module at ${url}`, response, config);
        }
        // TODO: handle checking for a resolve to index.d.ts whens someone imports the folder
        let content = yield response.text();
        if (!content) {
            return errorMsg(`Could not get text for DTS response at ${url}`, response, config);
        }
        const now = new Date();
        const cacheContent = `${now.toISOString()}-=-^-=-${lzstring_min_1.default.compressToUTF16(content)}`;
        localStorage.setItem(url, cacheContent);
        return content;
    });
    const getReferenceDependencies = (sourceCode, mod, path, config) => __awaiter(void 0, void 0, void 0, function* () {
        var match;
        if (sourceCode.indexOf("reference path") > 0) {
            // https://regex101.com/r/DaOegw/1
            const referencePathExtractionPattern = /<reference path="(.*)" \/>/gm;
            while ((match = referencePathExtractionPattern.exec(sourceCode)) !== null) {
                const relativePath = match[1];
                if (relativePath) {
                    let newPath = mapRelativePath(relativePath, path);
                    if (newPath) {
                        const dtsRefURL = unpkgURL(mod, newPath);
                        const dtsReferenceResponseText = yield getCachedDTSString(config, dtsRefURL);
                        if (!dtsReferenceResponseText) {
                            return errorMsg(`Could not get root d.ts file for the module '${mod}' at ${path}`, {}, config);
                        }
                        yield getDependenciesForModule(dtsReferenceResponseText, mod, newPath, config);
                        const representationalPath = `file:///node_modules/${mod}/${newPath}`;
                        config.addLibraryToRuntime(dtsReferenceResponseText, representationalPath);
                    }
                }
            }
        }
    });
    /**
     * Pseudo in-browser type acquisition tool, uses a
     */
    const detectNewImportsToAcquireTypeFor = (sourceCode, userAddLibraryToRuntime, fetcher = fetch, playgroundConfig) => __awaiter(void 0, void 0, void 0, function* () {
        // Wrap the runtime func with our own side-effect for visibility
        const addLibraryToRuntime = (code, path) => {
            globalishObj.typeDefinitions[path] = code;
            userAddLibraryToRuntime(code, path);
        };
        // Basically start the recursion with an undefined module
        const config = { sourceCode, addLibraryToRuntime, fetcher, logger: playgroundConfig.logger };
        const results = getDependenciesForModule(sourceCode, undefined, "playground.ts", config);
        return results;
    });
    exports.detectNewImportsToAcquireTypeFor = detectNewImportsToAcquireTypeFor;
    /**
     * Looks at a JS/DTS file and recurses through all the dependencies.
     * It avoids
     */
    const getDependenciesForModule = (sourceCode, moduleName, path, config) => {
        // Get all the import/requires for the file
        const filteredModulesToLookAt = parseFileForModuleReferences(sourceCode);
        filteredModulesToLookAt.forEach((name) => __awaiter(void 0, void 0, void 0, function* () {
            // Support grabbing the hard-coded node modules if needed
            const moduleToDownload = mapModuleNameToModule(name);
            if (!moduleName && moduleToDownload.startsWith(".")) {
                return config.logger.log("[ATA] Can't resolve relative dependencies from the playground root");
            }
            const moduleID = convertToModuleReferenceID(moduleName, moduleToDownload, moduleName);
            if (exports.acquiredTypeDefs[moduleID] || exports.acquiredTypeDefs[moduleID] === null) {
                return;
            }
            config.logger.log(`[ATA] Looking at ${moduleToDownload}`);
            const modIsScopedPackageOnly = moduleToDownload.indexOf("@") === 0 && moduleToDownload.split("/").length === 2;
            const modIsPackageOnly = moduleToDownload.indexOf("@") === -1 && moduleToDownload.split("/").length === 1;
            const isPackageRootImport = modIsPackageOnly || modIsScopedPackageOnly;
            const isDenoModule = moduleToDownload.indexOf("https://") === 0;
            if (isPackageRootImport) {
                // So it doesn't run twice for a package
                exports.acquiredTypeDefs[moduleID] = null;
                // E.g. import danger from "danger"
                const packageDef = yield getModuleAndRootDefTypePath(moduleToDownload, config);
                if (packageDef) {
                    exports.acquiredTypeDefs[moduleID] = packageDef.packageJSON;
                    yield addModuleToRuntime(packageDef.mod, packageDef.path, config);
                }
            }
            else if (isDenoModule) {
                // E.g. import { serve } from "https://deno.land/std@v0.12/http/server.ts";
                yield addModuleToRuntime(moduleToDownload, moduleToDownload, config);
            }
            else {
                // E.g. import {Component} from "./MyThing"
                if (!moduleToDownload || !path)
                    throw `No outer module or path for a relative import: ${moduleToDownload}`;
                const absolutePathForModule = mapRelativePath(moduleToDownload, path);
                // So it doesn't run twice for a package
                exports.acquiredTypeDefs[moduleID] = null;
                const resolvedFilepath = absolutePathForModule.endsWith(".ts")
                    ? absolutePathForModule
                    : absolutePathForModule + ".d.ts";
                yield addModuleToRuntime(moduleName, resolvedFilepath, config);
            }
        }));
        // Also support the
        getReferenceDependencies(sourceCode, moduleName, path, config);
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUFjcXVpc2l0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc2FuZGJveC9zcmMvdHlwZUFjcXVpc2l0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBR0EsTUFBTSxZQUFZLEdBQVEsT0FBTyxVQUFVLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUE7SUFDdkYsWUFBWSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7SUFFakM7OztPQUdHO0lBQ1UsUUFBQSxnQkFBZ0IsR0FBc0MsWUFBWSxDQUFDLGVBQWUsQ0FBQTtJQUkvRixNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ3JDLGtCQUFrQjtJQUNsQiwyREFBMkQsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlMQUFpTCxDQUFBO0lBRXRRLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxFQUFFO1FBQzlDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3hELE9BQU8seUJBQXlCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUE7U0FDbkc7UUFDRCxPQUFPLHlCQUF5QixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ3hGLENBQUMsQ0FBQTtJQUVELE1BQU0sY0FBYyxHQUFHLENBQUMs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QUcsVUFBVSxDQUFDLFdBQVcsQ0FBQTtvQkFDbkQsTUFBTSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7aUJBQ2xFO2FBQ0Y7aUJBQU0sSUFBSSxZQUFZLEVBQUU7Z0JBQ3ZCLDJFQUEyRTtnQkFDM0UsTUFBTSxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTthQUNyRTtpQkFBTTtnQkFDTCwyQ0FBMkM7Z0JBQzNDLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLElBQUk7b0JBQUUsTUFBTSxrREFBa0QsZ0JBQWdCLEVBQUUsQ0FBQTtnQkFFMUcsTUFBTSxxQkFBcUIsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBRXJFLHdDQUF3QztnQkFDeEMsd0JBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUVqQyxNQUFNLGdCQUFnQixHQUFHLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0JBQzVELENBQUMsQ0FBQyxxQkFBcUI7b0JBQ3ZCLENBQUMsQ0FBQyxxQkFBcUIsR0FBRyxPQUFPLENBQUE7Z0JBRW5DLE1BQU0sa0JBQWtCLENBQUMsVUFBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO2FBQ2hFO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQTtRQUVGLG1CQUFtQjtRQUNuQix3QkFBd0IsQ0FBQyxVQUFVLEVBQUUsVUFBVyxFQUFFLElBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTYW5kYm94Q29uZmlnIH0gZnJvbSBcIi4vXCJcbmltcG9ydCBsenN0cmluZyBmcm9tIFwiLi92ZW5kb3IvbHpzdHJpbmcubWluXCJcblxuY29uc3QgZ2xvYmFsaXNoT2JqOiBhbnkgPSB0eXBlb2YgZ2xvYmFsVGhpcyAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFRoaXMgOiB3aW5kb3cgfHwge31cbmdsb2JhbGlzaE9iai50eXBlRGVmaW5pdGlvbnMgPSB7fVxuXG4vKipcbiAqIFR5cGUgRGVmcyB3ZSd2ZSBhbHJlYWR5IGdvdCwgYW5kIG51bGxzIHdoZW4gc29tZXRoaW5nIGhhcyBmYWlsZWQuXG4gKiBUaGlzIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IGl0IGRvZXNuJ3QgaW5maW5pdGUgbG9vcC5cbiAqL1xuZXhwb3J0IGNvbnN0IGFjcXVpcmVkVHlwZURlZnM6IHsgW25hbWU6IHN0cmluZ106IHN0cmluZyB8IG51bGwgfSA9IGdsb2JhbGlzaE9iai50eXBlRGVmaW5pdGlvbnNcblxuZXhwb3J0IHR5cGUgQWRkTGliVG9SdW50aW1lRnVuYyA9IChjb2RlOiBzdHJpbmcsIHBhdGg6IHN0cmluZykgPT4gdm9pZFxuXG5jb25zdCBtb2R1bGVKU09OVVJMID0gKG5hbWU6IHN0cmluZykgPT5cbiAgLy8gcHJldHRpZXItaWdub3JlXG4gIGBodHRwczovL29mY25jb2cyY3UtZHNuLmFsZ29saWEubmV0LzEvaW5kZXhlcy9ucG0tc2VhcmNoLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfT9hdHRyaWJ1dGVzPXR5cGVzJngtYWxnb2xpYS1hZ2VudD1BbGdvbGlhJTIwZm9yJTIwdmFuaWxsYSUyMEphdmFTY3JpcHQlMjAobGl0ZSklMjAzLjI3LjEmeC1hbGdvbGlhLWFwcGxpY2F0aW9uLWlkPU9GQ05DT0cyQ1UmeC1hbGdvbGlhLWFwaS1rZXk9ZjU0ZTIxZmEzYTJhMDE2MDU5NWJiMDU4MTc5YmZiMWVgXG5cbmNvbnN0IHVucGtnVVJMID0gKG5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nKSA9PiB7XG4gIGlmICghbmFtZSkge1xuICAgIGNvbnN0IGFjdHVhbE5hbWUgPSBwYXRoLnN1YnN0cmluZygwLCBwYXRoLmluZGV4T2YoXCIvXCIpKVxuICAgIGNvbnN0IGFjdHVhbFBhdGggPSBwYXRoLnN1YnN0cmluZyhwYXRoLmluZGV4T2YoXCIvXCIpICsgMSlcbiAgICByZXR1cm4gYGh0dHBzOi8vd3d3LnVucGtnLmNvbS8ke2VuY29kZVVSSUNvbXBvbmVudChhY3R1YWxOYW1lKX0vJHtlbmNvZGVVUklDb21wb25lbnQoYWN0dWFsUGF0aCl9YFxuICB9XG4gIHJldHVybiBgaHR0cHM6Ly93d3cudW5wa2cuY29tLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpfS8ke2VuY29kZVVSSUNvbXBvbmVudChwYXRoKX1gXG59XG5cbmNvbnN0IHBhY2thZ2VKU09OVVJMID0gKG5hbWU6IHN0cmluZykgPT4gdW5wa2dVUkwobmFtZSwgXCJwYWNrYWdlLmpzb25cIilcblxuY29uc3QgZXJyb3JNc2cgPSAobXNnOiBzdHJpbmcsIHJlc3BvbnNlOiBhbnksIGNvbmZpZzogQVRBQ29uZmlnKSA9PiB7XG4gIGNvbmZpZy5sb2dnZXIuZXJyb3IoYCR7bXNnfSAtIHdpbGwgbm90IHRyeSBhZ2FpbiBpbiB0aGlzIHNlc3Npb25gLCByZXNwb25zZS5zdGF0dXMsIHJlc3BvbnNlLnN0YXR1c1RleHQsIHJlc3BvbnNlKVxufVxuXG4vKipcbiAqIEdyYWIgYW55IGltcG9ydC9yZXF1aXJlcyBmcm9tIGluc2lkZSB0aGUgY29kZSBhbmQgbWFrZSBhIGxpc3Qgb2ZcbiAqIGl0cyBkZXBlbmRlbmNpZXNcbiAqL1xuY29uc3QgcGFyc2VGaWxlRm9yTW9kdWxlUmVmZXJlbmNlcyA9IChzb3VyY2VDb2RlOiBzdHJpbmcpID0+IHtcbiAgLy8gaHR0cHM6Ly9yZWdleDEwMS5jb20vci9KeGEzS1gvNFxuICBjb25zdCByZXF1aXJlUGF0dGVybiA9IC8oY29uc3R8bGV0fHZhcikoLnxcXG4pKj8gcmVxdWlyZVxcKCgnfFwiKSguKikoJ3xcIilcXCk7PyQvZ21cbiAgLy8gdGhpcyBoYW5kbGUgdGhzICdmcm9tJyBpbXBvcnRzICBodHRwczovL3JlZ2V4MTAxLmNvbS9yL2hkRXB6Ty80XG4gIGNvbnN0IGVzNlBhdHRlcm4gPSAvKGltcG9ydHxleHBvcnQpKCg/IWZyb20pKD8hcmVxdWlyZSkoLnxcXG4pKSo/KGZyb218cmVxdWlyZVxcKClcXHM/KCd8XCIpKC4qKSgnfFwiKVxcKT87PyQvZ21cbiAgLy8gaHR0cHM6Ly9yZWdleDEwMS5jb20vci9oZEVwek8vOFxuICBjb25zdCBlczZJbXBvcnRPbmx5ID0gL2ltcG9ydFxccys/XFwoPygnfFwiKSguKikoJ3xcIilcXCk/Oz8vZ21cblxuICBjb25zdCBmb3VuZE1vZHVsZXMgPSBuZXcgU2V0PHN0cmluZz4oKVxuICB2YXIgbWF0Y2hcblxuICB3aGlsZSAoKG1hdGNoID0gZXM2UGF0dGVybi5leGVjKHNvdXJjZUNvZGUpKSAhPT0gbnVsbCkge1xuICAgIGlmIChtYXRjaFs2XSkgZm91bmRNb2R1bGVzLmFkZChtYXRjaFs2XSlcbiAgfVxuXG4gIHdoaWxlICgobWF0Y2ggPSByZXF1aXJlUGF0dGVybi5leGVjKHNvdXJjZUNvZGUpKSAhPT0gbnVsbCkge1xuICAgIGlmIChtYXRjaFs1XSkgZm91bmRNb2R1bGVzLmFkZChtYXRjaFs1XSlcbiAgfVxuXG4gIHdoaWxlICgobWF0Y2ggPSBlczZJbXBvcnRPbmx5LmV4ZWMoc291cmNlQ29kZSkpICE9PSBudWxsKSB7XG4gICAgaWYgKG1hdGNoWzJdKSBmb3VuZE1vZHVsZXMuYWRkKG1hdGNoWzJdKVxuICB9XG5cbiAgcmV0dXJuIEFycmF5LmZyb20oZm91bmRNb2R1bGVzKVxufVxuXG4vKiogQ29udmVydHMgc29tZSBvZiB0aGUga25vd24gZ2xvYmFsIGltcG9ydHMgdG8gbm9kZSBzbyB0aGF0IHdlIGdyYWIgdGhlIHJpZ2h0IGluZm8gKi9cbmNvbnN0IG1hcE1vZHVsZU5hbWVUb01vZHVsZSA9IChuYW1lOiBzdHJpbmcpID0+IHtcbiAgLy8gaW4gbm9kZSByZXBsOlxuICAvLyA+IHJlcXVpcmUoXCJtb2R1bGVcIikuYnVpbHRpbk1vZHVsZXNcbiAgY29uc3QgYnVpbHRJbk5vZGVNb2RzID0gW1xuICAgIFwiYXNzZXJ0XCIsXG4gICAgXCJhc3luY19ob29rc1wiLFxuICAgIFwiYnVmZmVyXCIsXG4gICAgXCJjaGlsZF9wcm9jZXNzXCIsXG4gICAgXCJjbHVzdGVyXCIsXG4gICAgXCJjb25zb2xlXCIsXG4gICAgXCJjb25zdGFudHNcIixcbiAgICBcImNyeXB0b1wiLFxuICAgIFwiZGdyYW1cIixcbiAgICBcImRuc1wiLFxuICAgIFwiZG9tYWluXCIsXG4gICAgXCJldmVudHNcIixcbiAgICBcImZzXCIsXG4gICAgXCJmcy9wcm9taXNlc1wiLFxuICAgIFwiaHR0cFwiLFxuICAgIFwiaHR0cDJcIixcbiAgICBcImh0dHBzXCIsXG4gICAgXCJpbnNwZWN0b3JcIixcbiAgICBcIm1vZHVsZVwiLFxuICAgIFwibmV0XCIsXG4gICAgXCJvc1wiLFxuICAgIFwicGF0aFwiLFxuICAgIFwicGVyZl9ob29rc1wiLFxuICAgIFwicHJvY2Vzc1wiLFxuICAgIFwicHVueWNvZGVcIixcbiAgICBcInF1ZXJ5c3RyaW5nXCIsXG4gICAgXCJyZWFkbGluZVwiLFxuICAgIFwicmVwbFwiLFxuICAgIFwic3RyZWFtXCIsXG4gICAgXCJzdHJpbmdfZGVjb2RlclwiLFxuICAgIFwic3lzXCIsXG4gICAgXCJ0aW1lcnNcIixcbiAgICBcInRsc1wiLFxuICAgIFwidHJhY2VfZXZlbnRzXCIsXG4gICAgXCJ0dHlcIixcbiAgICBcInVybFwiLFxuICAgIFwidXRpbFwiLFxuICAgIFwidjhcIixcbiAgICBcInZtXCIsXG4gICAgXCJ3YXNpXCIsXG4gICAgXCJ3b3JrZXJfdGhyZWFkc1wiLFxuICAgIFwiemxpYlwiLFxuICBdXG5cbiAgaWYgKGJ1aWx0SW5Ob2RlTW9kcy5pbmNsdWRlcyhuYW1lKSkge1xuICAgIHJldHVybiBcIm5vZGVcIlxuICB9XG4gIHJldHVybiBuYW1lXG59XG5cbi8vKiogQSByZWFsbHkgc2ltcGxlIHZlcnNpb24gb2YgcGF0aC5yZXNvbHZlICovXG5jb25zdCBtYXBSZWxhdGl2ZVBhdGggPSAobW9kdWxlRGVjbGFyYXRpb246IHN0cmluZywgY3VycmVudFBhdGg6IHN0cmluZykgPT4ge1xuICAvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNDc4MDM1MC9jb252ZXJ0LXJlbGF0aXZlLXBhdGgtdG8tYWJzb2x1dGUtdXNpbmctamF2YXNjcmlwdFxuICBmdW5jdGlvbiBhYnNvbHV0ZShiYXNlOiBzdHJpbmcsIHJlbGF0aXZlOiBzdHJpbmcpIHtcbiAgICBpZiAoIWJhc2UpIHJldHVybiByZWxhdGl2ZVxuXG4gICAgY29uc3Qgc3RhY2sgPSBiYXNlLnNwbGl0KFwiL1wiKVxuICAgIGNvbnN0IHBhcnRzID0gcmVsYXRpdmUuc3BsaXQoXCIvXCIpXG4gICAgc3RhY2sucG9wKCkgLy8gcmVtb3ZlIGN1cnJlbnQgZmlsZSBuYW1lIChvciBlbXB0eSBzdHJpbmcpXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocGFydHNbaV0gPT0gXCIuXCIpIGNvbnRpbnVlXG4gICAgICBpZiAocGFydHNbaV0gPT0gXCIuLlwiKSBzdGFjay5wb3AoKVxuICAgICAgZWxzZSBzdGFjay5wdXNoKHBhcnRzW2ldKVxuICAgIH1cbiAgICByZXR1cm4gc3RhY2suam9pbihcIi9cIilcbiAgfVxuXG4gIHJldHVybiBhYnNvbHV0ZShjdXJyZW50UGF0aCwgbW9kdWxlRGVjbGFyYXRpb24pXG59XG5cbmNvbnN0IGNvbnZlcnRUb01vZHVsZVJlZmVyZW5jZUlEID0gKG91dGVyTW9kdWxlOiBzdHJpbmcsIG1vZHVsZURlY2xhcmF0aW9uOiBzdHJpbmcsIGN1cnJlbnRQYXRoOiBzdHJpbmcpID0+IHtcbiAgY29uc3QgbW9kSXNTY29wZWRQYWNrYWdlT25seSA9IG1vZHVsZURlY2xhcmF0aW9uLmluZGV4T2YoXCJAXCIpID09PSAwICYmIG1vZHVsZURlY2xhcmF0aW9uLnNwbGl0KFwiL1wiKS5sZW5ndGggPT09IDJcbiAgY29uc3QgbW9kSXNQYWNrYWdlT25seSA9IG1vZHVsZURlY2xhcmF0aW9uLmluZGV4T2YoXCJAXCIpID09PSAtMSAmJiBtb2R1bGVEZWNsYXJhdGlvbi5zcGxpdChcIi9cIikubGVuZ3RoID09PSAxXG4gIGNvbnN0IGlzUGFja2FnZVJvb3RJbXBvcnQgPSBtb2RJc1BhY2thZ2VPbmx5IHx8IG1vZElzU2NvcGVkUGFja2FnZU9ubHlcblxuICBpZiAoaXNQYWNrYWdlUm9vdEltcG9ydCkge1xuICAgIHJldHVybiBtb2R1bGVEZWNsYXJhdGlvblxuICB9IGVsc2Uge1xuICAgIHJldHVybiBgJHtvdXRlck1vZHVsZX0tJHttYXBSZWxhdGl2ZVBhdGgobW9kdWxlRGVjbGFyYXRpb24sIGN1cnJlbnRQYXRoKX1gXG4gIH1cbn1cblxuLyoqXG4gKiBUYWtlcyBhbiBpbml0aWFsIG1vZHVsZSBhbmQgdGhlIHBhdGggZm9yIHRoZSByb290IG9mIHRoZSB0eXBpbmdzIGFuZCBncmFiIGl0IGFuZCBzdGFydCBncmFiYmluZyBpdHNcbiAqIGRlcGVuZGVuY2llcyB0aGVuIGFkZCB0aG9zZSB0aGUgdG8gcnVudGltZS5cbiAqL1xuY29uc3QgYWRkTW9kdWxlVG9SdW50aW1lID0gYXN5bmMgKG1vZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGNvbmZpZzogQVRBQ29uZmlnKSA9PiB7XG4gIGNvbnN0IGlzRGVubyA9IHBhdGggJiYgcGF0aC5pbmRleE9mKFwiaHR0cHM6Ly9cIikgPT09IDBcblxuICBsZXQgYWN0dWFsTW9kID0gbW9kXG4gIGxldCBhY3R1YWxQYXRoID0gcGF0aFxuXG4gIGlmICghbW9kKSB7XG4gICAgYWN0dWFsTW9kID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5pbmRleE9mKFwiL1wiKSlcbiAgICBhY3R1YWxQYXRoID0gcGF0aC5zdWJzdHJpbmcocGF0aC5pbmRleE9mKFwiL1wiKSArIDEpXG4gIH1cblxuICBjb25zdCBkdHNGaWxlVVJMID0gaXNEZW5vID8gcGF0aCA6IHVucGtnVVJMKGFjdHVhbE1vZCwgYWN0dWFsUGF0aClcblxuICBsZXQgY29udGVudCA9IGF3YWl0IGdldENhY2hlZERUU1N0cmluZyhjb25maWcsIGR0c0ZpbGVVUkwpXG4gIGlmICghY29udGVudCkge1xuICAgIGNvbnN0IGlzRGVubyA9IGFjdHVhbFBhdGggJiYgYWN0dWFsUGF0aC5pbmRleE9mKFwiaHR0cHM6Ly9cIikgPT09IDBcblxuICAgIGNvbnN0IGR0c0ZpbGVVUkwgPSBpc0Rlbm8gPyBhY3R1YWxQYXRoIDogdW5wa2dVUkwoYWN0dWFsTW9kLCBgJHthY3R1YWxQYXRoLnJlcGxhY2UoXCIuZC50c1wiLCBcIlwiKX0vaW5kZXguZC50c2ApXG4gICAgY29udGVudCA9IGF3YWl0IGdldENhY2hlZERUU1N0cmluZyhjb25maWcsIGR0c0ZpbGVVUkwpXG5cbiAgICBpZiAoIWNvbnRlbnQpIHtcbiAgICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgbm90IGdldCByb290IGQudHMgZmlsZSBmb3IgdGhlIG1vZHVsZSAnJHthY3R1YWxNb2R9JyBhdCAke2FjdHVhbFBhdGh9YCwge30sIGNvbmZpZylcbiAgICB9XG4gIH1cblxuICAvLyBOb3cgbG9vayBhbmQgZ3JhYiBkZXBlbmRlbnQgbW9kdWxlcyB3aGVyZSB5b3UgbmVlZCB0aGVcbiAgYXdhaXQgZ2V0RGVwZW5kZW5jaWVzRm9yTW9kdWxlKGNvbnRlbnQsIGFjdHVhbE1vZCwgYWN0dWFsUGF0aCwgY29uZmlnKVxuXG4gIGlmIChpc0Rlbm8pIHtcbiAgICBjb25zdCB3cmFwcGVkID0gYGRlY2xhcmUgbW9kdWxlIFwiJHthY3R1YWxQYXRofVwiIHsgJHtjb250ZW50fSB9YFxuICAgIGNvbmZpZy5hZGRMaWJyYXJ5VG9SdW50aW1lKHdyYXBwZWQsIGFjdHVhbFBhdGgpXG4gIH0gZWxzZSB7XG4gICAgY29uZmlnLmFkZExpYnJhcnlUb1J1bnRpbWUoY29udGVudCwgYGZpbGU6Ly8vbm9kZV9tb2R1bGVzLyR7YWN0dWFsTW9kfS8ke2FjdHVhbFBhdGh9YClcbiAgfVxufVxuXG4vKipcbiAqIFRha2VzIGEgbW9kdWxlIGltcG9ydCwgdGhlbiB1c2VzIGJvdGggdGhlIGFsZ29saWEgQVBJIGFuZCB0aGUgdGhlIHBhY2thZ2UuanNvbiB0byBkZXJpdmVcbiAqIHRoZSByb290IHR5cGUgZGVmIHBhdGguXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhY2thZ2VOYW1lXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx7IG1vZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHBhY2thZ2VKU09OOiBhbnkgfT59XG4gKi9cbmNvbnN0IGdldE1vZHVsZUFuZFJvb3REZWZUeXBlUGF0aCA9IGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICBjb25zdCB1cmwgPSBtb2R1bGVKU09OVVJMKHBhY2thZ2VOYW1lKVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29uZmlnLmZldGNoZXIodXJsKVxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgcmV0dXJuIGVycm9yTXNnKGBDb3VsZCBub3QgZ2V0IEFsZ29saWEgSlNPTiBmb3IgdGhlIG1vZHVsZSAnJHtwYWNrYWdlTmFtZX0nYCwgcmVzcG9uc2UsIGNvbmZpZylcbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlSlNPTiA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxuICBpZiAoIXJlc3BvbnNlSlNPTikge1xuICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgdGhlIEFsZ29saWEgSlNPTiB3YXMgdW4tcGFyc2FibGUgZm9yIHRoZSBtb2R1bGUgJyR7cGFja2FnZU5hbWV9J2AsIHJlc3BvbnNlLCBjb25maWcpXG4gIH1cblxuICBpZiAoIXJlc3BvbnNlSlNPTi50eXBlcykge1xuICAgIHJldHVybiBjb25maWcubG9nZ2VyLmxvZyhgVGhlcmUgd2VyZSBubyB0eXBlcyBmb3IgJyR7cGFja2FnZU5hbWV9JyAtIHdpbGwgbm90IHRyeSBhZ2FpbiBpbiB0aGlzIHNlc3Npb25gKVxuICB9XG4gIGlmICghcmVzcG9uc2VKU09OLnR5cGVzLnRzKSB7XG4gICAgcmV0dXJuIGNvbmZpZy5sb2dnZXIubG9nKGBUaGVyZSB3ZXJlIG5vIHR5cGVzIGZvciAnJHtwYWNrYWdlTmFtZX0nIC0gd2lsbCBub3QgdHJ5IGFnYWluIGluIHRoaXMgc2Vzc2lvbmApXG4gIH1cblxuICBhY3F1aXJlZFR5cGVEZWZzW3BhY2thZ2VOYW1lXSA9IHJlc3BvbnNlSlNPTlxuXG4gIGlmIChyZXNwb25zZUpTT04udHlwZXMudHMgPT09IFwiaW5jbHVkZWRcIikge1xuICAgIGNvbnN0IG1vZFBhY2thZ2VVUkwgPSBwYWNrYWdlSlNPTlVSTChwYWNrYWdlTmFtZSlcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29uZmlnLmZldGNoZXIobW9kUGFja2FnZVVSTClcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgUGFja2FnZSBKU09OIGZvciB0aGUgbW9kdWxlICcke3BhY2thZ2VOYW1lfSdgLCByZXNwb25zZSwgY29uZmlnKVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlSlNPTiA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxuICAgIGlmICghcmVzcG9uc2VKU09OKSB7XG4gICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgUGFja2FnZSBKU09OIGZvciB0aGUgbW9kdWxlICcke3BhY2thZ2VOYW1lfSdgLCByZXNwb25zZSwgY29uZmlnKVxuICAgIH1cblxuICAgIGNvbmZpZy5hZGRMaWJyYXJ5VG9SdW50aW1lKFxuICAgICAgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VKU09OLCBudWxsLCBcIiAgXCIpLFxuICAgICAgYGZpbGU6Ly8vbm9kZV9tb2R1bGVzLyR7cGFja2FnZU5hbWV9L3BhY2thZ2UuanNvbmBcbiAgICApXG5cbiAgICAvLyBHZXQgdGhlIHBhdGggb2YgdGhlIHJvb3QgZC50cyBmaWxlXG5cbiAgICAvLyBub24taW5mZXJyZWQgcm91dGVcbiAgICBsZXQgcm9vdFR5cGVQYXRoID0gcmVzcG9uc2VKU09OLnR5cGluZyB8fCByZXNwb25zZUpTT04udHlwaW5ncyB8fCByZXNwb25zZUpTT04udHlwZXNcblxuICAgIC8vIHBhY2thZ2UgbWFpbiBpcyBjdXN0b21cbiAgICBpZiAoIXJvb3RUeXBlUGF0aCAmJiB0eXBlb2YgcmVzcG9uc2VKU09OLm1haW4gPT09IFwic3RyaW5nXCIgJiYgcmVzcG9uc2VKU09OLm1haW4uaW5kZXhPZihcIi5qc1wiKSA+IDApIHtcbiAgICAgIHJvb3RUeXBlUGF0aCA9IHJlc3BvbnNlSlNPTi5tYWluLnJlcGxhY2UoL2pzJC8sIFwiZC50c1wiKVxuICAgIH1cblxuICAgIC8vIEZpbmFsIGZhbGxiYWNrLCB0byBoYXZlIGdvdCBoZXJlIGl0IG11c3QgaGF2ZSBwYXNzZWQgaW4gYWxnb2xpYVxuICAgIGlmICghcm9vdFR5cGVQYXRoKSB7XG4gICAgICByb290VHlwZVBhdGggPSBcImluZGV4LmQudHNcIlxuICAgIH1cblxuICAgIHJldHVybiB7IG1vZDogcGFja2FnZU5hbWUsIHBhdGg6IHJvb3RUeXBlUGF0aCwgcGFja2FnZUpTT046IHJlc3BvbnNlSlNPTiB9XG4gIH0gZWxzZSBpZiAocmVzcG9uc2VKU09OLnR5cGVzLnRzID09PSBcImRlZmluaXRlbHktdHlwZWRcIikge1xuICAgIHJldHVybiB7IG1vZDogcmVzcG9uc2VKU09OLnR5cGVzLmRlZmluaXRlbHlUeXBlZCwgcGF0aDogXCJpbmRleC5kLnRzXCIsIHBhY2thZ2VKU09OOiByZXNwb25zZUpTT04gfVxuICB9IGVsc2Uge1xuICAgIHRocm93IFwiVGhpcyBzaG91bGRuJ3QgaGFwcGVuXCJcbiAgfVxufVxuXG5jb25zdCBnZXRDYWNoZWREVFNTdHJpbmcgPSBhc3luYyAoY29uZmlnOiBBVEFDb25maWcsIHVybDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGNhY2hlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVybClcbiAgaWYgKGNhY2hlZCkge1xuICAgIGNvbnN0IFtkYXRlU3RyaW5nLCB0ZXh0XSA9IGNhY2hlZC5zcGxpdChcIi09LV4tPS1cIilcbiAgICBjb25zdCBjYWNoZWREYXRlID0gbmV3IERhdGUoZGF0ZVN0cmluZylcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpXG5cbiAgICBjb25zdCBjYWNoZVRpbWVvdXQgPSA2MDQ4MDAwMDAgLy8gMSB3ZWVrXG4gICAgLy8gY29uc3QgY2FjaGVUaW1lb3V0ID0gNjAwMDAgLy8gMSBtaW5cblxuICAgIGlmIChub3cuZ2V0VGltZSgpIC0gY2FjaGVkRGF0ZS5nZXRUaW1lKCkgPCBjYWNoZVRpbWVvdXQpIHtcbiAgICAgIHJldHVybiBsenN0cmluZy5kZWNvbXByZXNzRnJvbVVURjE2KHRleHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiU2tpcHBpbmcgY2FjaGUgZm9yIFwiLCB1cmwpXG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb25maWcuZmV0Y2hlcih1cmwpXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgRFRTIHJlc3BvbnNlIGZvciB0aGUgbW9kdWxlIGF0ICR7dXJsfWAsIHJlc3BvbnNlLCBjb25maWcpXG4gIH1cblxuICAvLyBUT0RPOiBoYW5kbGUgY2hlY2tpbmcgZm9yIGEgcmVzb2x2ZSB0byBpbmRleC5kLnRzIHdoZW5zIHNvbWVvbmUgaW1wb3J0cyB0aGUgZm9sZGVyXG4gIGxldCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG4gIGlmICghY29udGVudCkge1xuICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgbm90IGdldCB0ZXh0IGZvciBEVFMgcmVzcG9uc2UgYXQgJHt1cmx9YCwgcmVzcG9uc2UsIGNvbmZpZylcbiAgfVxuXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKClcbiAgY29uc3QgY2FjaGVDb250ZW50ID0gYCR7bm93LnRvSVNPU3RyaW5nKCl9LT0tXi09LSR7bHpzdHJpbmcuY29tcHJlc3NUb1VURjE2KGNvbnRlbnQpfWBcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXJsLCBjYWNoZUNvbnRlbnQpXG4gIHJldHVybiBjb250ZW50XG59XG5cbmNvbnN0IGdldFJlZmVyZW5jZURlcGVuZGVuY2llcyA9IGFzeW5jIChzb3VyY2VDb2RlOiBzdHJpbmcsIG1vZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGNvbmZpZzogQVRBQ29uZmlnKSA9PiB7XG4gIHZhciBtYXRjaFxuICBpZiAoc291cmNlQ29kZS5pbmRleE9mKFwicmVmZXJlbmNlIHBhdGhcIikgPiAwKSB7XG4gICAgLy8gaHR0cHM6Ly9yZWdleDEwMS5jb20vci9EYU9lZ3cvMVxuICAgIGNvbnN0IHJlZmVyZW5jZVBhdGhFeHRyYWN0aW9uUGF0dGVybiA9IC88cmVmZXJlbmNlIHBhdGg9XCIoLiopXCIgXFwvPi9nbVxuICAgIHdoaWxlICgobWF0Y2ggPSByZWZlcmVuY2VQYXRoRXh0cmFjdGlvblBhdHRlcm4uZXhlYyhzb3VyY2VDb2RlKSkgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IG1hdGNoWzFdXG4gICAgICBpZiAocmVsYXRpdmVQYXRoKSB7XG4gICAgICAgIGxldCBuZXdQYXRoID0gbWFwUmVsYXRpdmVQYXRoKHJlbGF0aXZlUGF0aCwgcGF0aClcbiAgICAgICAgaWYgKG5ld1BhdGgpIHtcbiAgICAgICAgICBjb25zdCBkdHNSZWZVUkwgPSB1bnBrZ1VSTChtb2QsIG5ld1BhdGgpXG5cbiAgICAgICAgICBjb25zdCBkdHNSZWZlcmVuY2VSZXNwb25zZVRleHQgPSBhd2FpdCBnZXRDYWNoZWREVFNTdHJpbmcoY29uZmlnLCBkdHNSZWZVUkwpXG4gICAgICAgICAgaWYgKCFkdHNSZWZlcmVuY2VSZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgbm90IGdldCByb290IGQudHMgZmlsZSBmb3IgdGhlIG1vZHVsZSAnJHttb2R9JyBhdCAke3BhdGh9YCwge30sIGNvbmZpZylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhd2FpdCBnZXREZXBlbmRlbmNpZXNGb3JNb2R1bGUoZHRzUmVmZXJlbmNlUmVzcG9uc2VUZXh0LCBtb2QsIG5ld1BhdGgsIGNvbmZpZylcbiAgICAgICAgICBjb25zdCByZXByZXNlbnRhdGlvbmFsUGF0aCA9IGBmaWxlOi8vL25vZGVfbW9kdWxlcy8ke21vZH0vJHtuZXdQYXRofWBcbiAgICAgICAgICBjb25maWcuYWRkTGlicmFyeVRvUnVudGltZShkdHNSZWZlcmVuY2VSZXNwb25zZVRleHQsIHJlcHJlc2VudGF0aW9uYWxQYXRoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBBVEFDb25maWcge1xuICBzb3VyY2VDb2RlOiBzdHJpbmdcbiAgYWRkTGlicmFyeVRvUnVudGltZTogQWRkTGliVG9SdW50aW1lRnVuY1xuICBmZXRjaGVyOiB0eXBlb2YgZmV0Y2hcbiAgbG9nZ2VyOiBTYW5kYm94Q29uZmlnW1wibG9nZ2VyXCJdXG59XG5cbi8qKlxuICogUHNldWRvIGluLWJyb3dzZXIgdHlwZSBhY3F1aXNpdGlvbiB0b29sLCB1c2VzIGFcbiAqL1xuZXhwb3J0IGNvbnN0IGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yID0gYXN5bmMgKFxuICBzb3VyY2VDb2RlOiBzdHJpbmcsXG4gIHVzZXJBZGRMaWJyYXJ5VG9SdW50aW1lOiBBZGRMaWJUb1J1bnRpbWVGdW5jLFxuICBmZXRjaGVyID0gZmV0Y2gsXG4gIHBsYXlncm91bmRDb25maWc6IFNhbmRib3hDb25maWdcbikgPT4ge1xuICAvLyBXcmFwIHRoZSBydW50aW1lIGZ1bmMgd2l0aCBvdXIgb3duIHNpZGUtZWZmZWN0IGZvciB2aXNpYmlsaXR5XG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBnbG9iYWxpc2hPYmoudHlwZURlZmluaXRpb25zW3BhdGhdID0gY29kZVxuICAgIHVzZXJBZGRMaWJyYXJ5VG9SdW50aW1lKGNvZGUsIHBhdGgpXG4gIH1cblxuICAvLyBCYXNpY2FsbHkgc3RhcnQgdGhlIHJlY3Vyc2lvbiB3aXRoIGFuIHVuZGVmaW5lZCBtb2R1bGVcbiAgY29uc3QgY29uZmlnOiBBVEFDb25maWcgPSB7IHNvdXJjZUNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIGZldGNoZXIsIGxvZ2dlcjogcGxheWdyb3VuZENvbmZpZy5sb2dnZXIgfVxuICBjb25zdCByZXN1bHRzID0gZ2V0RGVwZW5kZW5jaWVzRm9yTW9kdWxlKHNvdXJjZUNvZGUsIHVuZGVmaW5lZCwgXCJwbGF5Z3JvdW5kLnRzXCIsIGNvbmZpZylcbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuLyoqXG4gKiBMb29rcyBhdCBhIEpTL0RUUyBmaWxlIGFuZCByZWN1cnNlcyB0aHJvdWdoIGFsbCB0aGUgZGVwZW5kZW5jaWVzLlxuICogSXQgYXZvaWRzXG4gKi9cbmNvbnN0IGdldERlcGVuZGVuY2llc0Zvck1vZHVsZSA9IChcbiAgc291cmNlQ29kZTogc3RyaW5nLFxuICBtb2R1bGVOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHBhdGg6IHN0cmluZyxcbiAgY29uZmlnOiBBVEFDb25maWdcbikgPT4ge1xuICAvLyBHZXQgYWxsIHRoZSBpbXBvcnQvcmVxdWlyZXMgZm9yIHRoZSBmaWxlXG4gIGNvbnN0IGZpbHRlcmVkTW9kdWxlc1RvTG9va0F0ID0gcGFyc2VGaWxlRm9yTW9kdWxlUmVmZXJlbmNlcyhzb3VyY2VDb2RlKVxuICBmaWx0ZXJlZE1vZHVsZXNUb0xvb2tBdC5mb3JFYWNoKGFzeW5jIG5hbWUgPT4ge1xuICAgIC8vIFN1cHBvcnQgZ3JhYmJpbmcgdGhlIGhhcmQtY29kZWQgbm9kZSBtb2R1bGVzIGlmIG5lZWRlZFxuICAgIGNvbnN0IG1vZHVsZVRvRG93bmxvYWQgPSBtYXBNb2R1bGVOYW1lVG9Nb2R1bGUobmFtZSlcblxuICAgIGlmICghbW9kdWxlTmFtZSAmJiBtb2R1bGVUb0Rvd25sb2FkLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgICByZXR1cm4gY29uZmlnLmxvZ2dlci5sb2coXCJbQVRBXSBDYW4ndCByZXNvbHZlIHJlbGF0aXZlIGRlcGVuZGVuY2llcyBmcm9tIHRoZSBwbGF5Z3JvdW5kIHJvb3RcIilcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVJRCA9IGNvbnZlcnRUb01vZHVsZVJlZmVyZW5jZUlEKG1vZHVsZU5hbWUhLCBtb2R1bGVUb0Rvd25sb2FkLCBtb2R1bGVOYW1lISlcbiAgICBpZiAoYWNxdWlyZWRUeXBlRGVmc1ttb2R1bGVJRF0gfHwgYWNxdWlyZWRUeXBlRGVmc1ttb2R1bGVJRF0gPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5sb2dnZXIubG9nKGBbQVRBXSBMb29raW5nIGF0ICR7bW9kdWxlVG9Eb3dubG9hZH1gKVxuXG4gICAgY29uc3QgbW9kSXNTY29wZWRQYWNrYWdlT25seSA9IG1vZHVsZVRvRG93bmxvYWQuaW5kZXhPZihcIkBcIikgPT09IDAgJiYgbW9kdWxlVG9Eb3dubG9hZC5zcGxpdChcIi9cIikubGVuZ3RoID09PSAyXG4gICAgY29uc3QgbW9kSXNQYWNrYWdlT25seSA9IG1vZHVsZVRvRG93bmxvYWQuaW5kZXhPZihcIkBcIikgPT09IC0xICYmIG1vZHVsZVRvRG93bmxvYWQuc3BsaXQoXCIvXCIpLmxlbmd0aCA9PT0gMVxuICAgIGNvbnN0IGlzUGFja2FnZVJvb3RJbXBvcnQgPSBtb2RJc1BhY2thZ2VPbmx5IHx8IG1vZElzU2NvcGVkUGFja2FnZU9ubHlcbiAgICBjb25zdCBpc0Rlbm9Nb2R1bGUgPSBtb2R1bGVUb0Rvd25sb2FkLmluZGV4T2YoXCJodHRwczovL1wiKSA9PT0gMFxuXG4gICAgaWYgKGlzUGFja2FnZVJvb3RJbXBvcnQpIHtcbiAgICAgIC8vIFNvIGl0IGRvZXNuJ3QgcnVuIHR3aWNlIGZvciBhIHBhY2thZ2VcbiAgICAgIGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdID0gbnVsbFxuXG4gICAgICAvLyBFLmcuIGltcG9ydCBkYW5nZXIgZnJvbSBcImRhbmdlclwiXG4gICAgICBjb25zdCBwYWNrYWdlRGVmID0gYXdhaXQgZ2V0TW9kdWxlQW5kUm9vdERlZlR5cGVQYXRoKG1vZHVsZVRvRG93bmxvYWQsIGNvbmZpZylcblxuICAgICAgaWYgKHBhY2thZ2VEZWYpIHtcbiAgICAgICAgYWNxdWlyZWRUeXBlRGVmc1ttb2R1bGVJRF0gPSBwYWNrYWdlRGVmLnBhY2thZ2VKU09OXG4gICAgICAgIGF3YWl0IGFkZE1vZHVsZVRvUnVudGltZShwYWNrYWdlRGVmLm1vZCwgcGFja2FnZURlZi5wYXRoLCBjb25maWcpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc0Rlbm9Nb2R1bGUpIHtcbiAgICAgIC8vIEUuZy4gaW1wb3J0IHsgc2VydmUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQHYwLjEyL2h0dHAvc2VydmVyLnRzXCI7XG4gICAgICBhd2FpdCBhZGRNb2R1bGVUb1J1bnRpbWUobW9kdWxlVG9Eb3dubG9hZCwgbW9kdWxlVG9Eb3dubG9hZCwgY29uZmlnKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFLmcuIGltcG9ydCB7Q29tcG9uZW50fSBmcm9tIFwiLi9NeVRoaW5nXCJcbiAgICAgIGlmICghbW9kdWxlVG9Eb3dubG9hZCB8fCAhcGF0aCkgdGhyb3cgYE5vIG91dGVyIG1vZHVsZSBvciBwYXRoIGZvciBhIHJlbGF0aXZlIGltcG9ydDogJHttb2R1bGVUb0Rvd25sb2FkfWBcblxuICAgICAgY29uc3QgYWJzb2x1dGVQYXRoRm9yTW9kdWxlID0gbWFwUmVsYXRpdmVQYXRoKG1vZHVsZVRvRG93bmxvYWQsIHBhdGgpXG5cbiAgICAgIC8vIFNvIGl0IGRvZXNuJ3QgcnVuIHR3aWNlIGZvciBhIHBhY2thZ2VcbiAgICAgIGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdID0gbnVsbFxuXG4gICAgICBjb25zdCByZXNvbHZlZEZpbGVwYXRoID0gYWJzb2x1dGVQYXRoRm9yTW9kdWxlLmVuZHNXaXRoKFwiLnRzXCIpXG4gICAgICAgID8gYWJzb2x1dGVQYXRoRm9yTW9kdWxlXG4gICAgICAgIDogYWJzb2x1dGVQYXRoRm9yTW9kdWxlICsgXCIuZC50c1wiXG5cbiAgICAgIGF3YWl0IGFkZE1vZHVsZVRvUnVudGltZShtb2R1bGVOYW1lISwgcmVzb2x2ZWRGaWxlcGF0aCwgY29uZmlnKVxuICAgIH1cbiAgfSlcblxuICAvLyBBbHNvIHN1cHBvcnQgdGhlXG4gIGdldFJlZmVyZW5jZURlcGVuZGVuY2llcyhzb3VyY2VDb2RlLCBtb2R1bGVOYW1lISwgcGF0aCEsIGNvbmZpZylcbn1cbiJdfQ==