define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createVirtualLanguageServiceHost = exports.createVirtualCompilerHost = exports.createFSBackedSystem = exports.createSystem = exports.createDefaultMapFromCDN = exports.addFilesForTypesIntoFolder = exports.addAllFilesFromFolder = exports.createDefaultMapFromNodeModules = exports.knownLibFilesForCompilerOptions = exports.createVirtualTypeScriptEnvironment = void 0;
    let hasLocalStorage = false;
    try {
        hasLocalStorage = typeof localStorage !== `undefined`;
    }
    catch (error) { }
    const hasProcess = typeof process !== `undefined`;
    const shouldDebug = (hasLocalStorage && localStorage.getItem("DEBUG")) || (hasProcess && process.env.DEBUG);
    const debugLog = shouldDebug ? console.log : (_message, ..._optionalParams) => "";
    /**
     * Makes a virtual copy of the TypeScript environment. This is the main API you want to be using with
     * @typescript/vfs. A lot of the other exposed functions are used by this function to get set up.
     *
     * @param sys an object which conforms to the TS Sys (a shim over read/write access to the fs)
     * @param rootFiles a list of files which are considered inside the project
     * @param ts a copy pf the TypeScript module
     * @param compilerOptions the options for this compiler run
     * @param customTransformers custom transformers for this compiler run
     */
    function createVirtualTypeScriptEnvironment(sys, rootFiles, ts, compilerOptions = {}, customTransformers) {
        const mergedCompilerOpts = Object.assign(Object.assign({}, defaultCompilerOptions(ts)), compilerOptions);
        const { languageServiceHost, updateFile } = createVirtualLanguageServiceHost(sys, rootFiles, mergedCompilerOpts, ts, customTransformers);
        const languageService = ts.createLanguageService(languageServiceHost);
        const diagnostics = languageService.getCompilerOptionsDiagnostics();
        if (diagnostics.length) {
            const compilerHost = createVirtualCompilerHost(sys, compilerOptions, ts);
            throw new Error(ts.formatDiagnostics(diagnostics, compilerHost.compilerHost));
        }
        return {
            // @ts-ignore
            name: "vfs",
            sys,
            languageService,
            getSourceFile: fileName => { var _a; return (_a = languageService.getProgram()) === null || _a === void 0 ? void 0 : _a.getSourceFile(fileName); },
            createFile: (fileName, content) => {
                updateFile(ts.createSourceFile(fileName, content, mergedCompilerOpts.target, false));
            },
            updateFile: (fileName, content, optPrevTextSpan) => {
                const prevSourceFile = languageService.getProgram().getSourceFile(fileName);
                if (!prevSourceFile) {
                    throw new Error("Did not find a source file for " + fileName);
                }
                const prevFullContents = prevSourceFile.text;
                // TODO: Validate if the default text span has a fencepost error?
                const prevTextSpan = optPrevTextSpan !== null && optPrevTextSpan !== void 0 ? optPrevTextSpan : ts.createTextSpan(0, prevFullContents.length);
                const newText = prevFullContents.slice(0, prevTextSpan.start) +
                    content +
                    prevFullContents.slice(prevTextSpan.start + prevTextSpan.length);
                const newSourceFile = ts.updateSourceFile(prevSourceFile, newText, {
                    span: prevTextSpan,
                    newLength: content.length,
                });
                updateFile(newSourceFile);
            },
        };
    }
    exports.createVirtualTypeScriptEnvironment = createVirtualTypeScriptEnvironment;
    /**
     * Grab the list of lib files for a particular target, will return a bit more than necessary (by including
     * the dom) but that's OK
     *
     * @param target The compiler settings target baseline
     * @param ts A copy of the TypeScript module
     */
    const knownLibFilesForCompilerOptions = (compilerOptions, ts) => {
        const target = compilerOptions.target || ts.ScriptTarget.ES5;
        const lib = compilerOptions.lib || [];
        const files = [
            "lib.d.ts",
            "lib.dom.d.ts",
            "lib.dom.iterable.d.ts",
            "lib.webworker.d.ts",
            "lib.webworker.importscripts.d.ts",
            "lib.scripthost.d.ts",
            "lib.es5.d.ts",
            "lib.es6.d.ts",
            "lib.es2015.collection.d.ts",
            "lib.es2015.core.d.ts",
            "lib.es2015.d.ts",
            "lib.es2015.generator.d.ts",
            "lib.es2015.iterable.d.ts",
            "lib.es2015.promise.d.ts",
            "lib.es2015.proxy.d.ts",
            "lib.es2015.reflect.d.ts",
            "lib.es2015.symbol.d.ts",
            "lib.es2015.symbol.wellknown.d.ts",
            "lib.es2016.array.include.d.ts",
            "lib.es2016.d.ts",
            "lib.es2016.full.d.ts",
            "lib.es2017.d.ts",
            "lib.es2017.full.d.ts",
            "lib.es2017.intl.d.ts",
            "lib.es2017.object.d.ts",
            "lib.es2017.sharedmemory.d.ts",
            "lib.es2017.string.d.ts",
            "lib.es2017.typedarrays.d.ts",
            "lib.es2018.asyncgenerator.d.ts",
            "lib.es2018.asynciterable.d.ts",
            "lib.es2018.d.ts",
            "lib.es2018.full.d.ts",
            "lib.es2018.intl.d.ts",
            "lib.es2018.promise.d.ts",
            "lib.es2018.regexp.d.ts",
            "lib.es2019.array.d.ts",
            "lib.es2019.d.ts",
            "lib.es2019.full.d.ts",
            "lib.es2019.object.d.ts",
            "lib.es2019.string.d.ts",
            "lib.es2019.symbol.d.ts",
            "lib.es2020.d.ts",
            "lib.es2020.full.d.ts",
            "lib.es2020.string.d.ts",
            "lib.es2020.symbol.wellknown.d.ts",
            "lib.es2020.bigint.d.ts",
            "lib.es2020.promise.d.ts",
            "lib.es2020.sharedmemory.d.ts",
            "lib.es2020.intl.d.ts",
            "lib.esnext.array.d.ts",
            "lib.esnext.asynciterable.d.ts",
            "lib.esnext.bigint.d.ts",
            "lib.esnext.d.ts",
            "lib.esnext.full.d.ts",
            "lib.esnext.intl.d.ts",
            "lib.esnext.symbol.d.ts",
        ];
        const targetToCut = ts.ScriptTarget[target];
        const matches = files.filter(f => f.startsWith(`lib.${targetToCut.toLowerCase()}`));
        const targetCutIndex = files.indexOf(matches.pop());
        const getMax = (array) => array && array.length ? array.reduce((max, current) => (current > max ? current : max)) : undefined;
        // Find the index for everything in
        const indexesForCutting = lib.map(lib => {
            const matches = files.filter(f => f.startsWith(`lib.${lib.toLowerCase()}`));
            if (matches.length === 0)
                return 0;
            const cutIndex = files.indexOf(matches.pop());
            return cutIndex;
        });
        const libCutIndex = getMax(indexesForCutting) || 0;
        const finalCutIndex = Math.max(targetCutIndex, libCutIndex);
        return files.slice(0, finalCutIndex + 1);
    };
    exports.knownLibFilesForCompilerOptions = knownLibFilesForCompilerOptions;
    /**
     * Sets up a Map with lib contents by grabbing the necessary files from
     * the local copy of typescript via the file system.
     */
    const createDefaultMapFromNodeModules = (compilerOptions, ts) => {
        const tsModule = ts || require("typescript");
        const path = requirePath();
        const fs = requireFS();
        const getLib = (name) => {
            const lib = path.dirname(require.resolve("typescript"));
            return fs.readFileSync(path.join(lib, name), "utf8");
        };
        const libs = (0, exports.knownLibFilesForCompilerOptions)(compilerOptions, tsModule);
        const fsMap = new Map();
        libs.forEach(lib => {
            fsMap.set("/" + lib, getLib(lib));
        });
        return fsMap;
    };
    exports.createDefaultMapFromNodeModules = createDefaultMapFromNodeModules;
    /**
     * Adds recursively files from the FS into the map based on the folder
     */
    const addAllFilesFromFolder = (map, workingDir) => {
        const path = requirePath();
        const fs = requireFS();
        const walk = function (dir) {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(function (file) {
                file = path.join(dir, file);
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    /* Recurse into a subdirectory */
                    results = results.concat(walk(file));
                }
                else {
                    /* Is a file */
                    results.push(file);
                }
            });
            return results;
        };
        const allFiles = walk(workingDir);
        allFiles.forEach(lib => {
            const fsPath = "/node_modules/@types" + lib.replace(workingDir, "");
            const content = fs.readFileSync(lib, "utf8");
            const validExtensions = [".ts", ".tsx"];
            if (validExtensions.includes(path.extname(fsPath))) {
                map.set(fsPath, content);
            }
        });
    };
    exports.addAllFilesFromFolder = addAllFilesFromFolder;
    /** Adds all files from node_modules/@types into the FS Map */
    const addFilesForTypesIntoFolder = (map) => (0, exports.addAllFilesFromFolder)(map, "node_modules/@types");
    exports.addFilesForTypesIntoFolder = addFilesForTypesIntoFolder;
    /**
     * Create a virtual FS Map with the lib files from a particular TypeScript
     * version based on the target, Always includes dom ATM.
     *
     * @param options The compiler target, which dictates the libs to set up
     * @param version the versions of TypeScript which are supported
     * @param cache should the values be stored in local storage
     * @param ts a copy of the typescript import
     * @param lzstring an optional copy of the lz-string import
     * @param fetcher an optional replacement for the global fetch function (tests mainly)
     * @param storer an optional replacement for the localStorage global (tests mainly)
     */
    const createDefaultMapFromCDN = (options, version, cache, ts, lzstring, fetcher, storer) => {
        const fetchlike = fetcher || fetch;
        const storelike = storer || localStorage;
        const fsMap = new Map();
        const files = (0, exports.knownLibFilesForCompilerOptions)(options, ts);
        const prefix = `https://typescript.azureedge.net/cdn/${version}/typescript/lib/`;
        function zip(str) {
            return lzstring ? lzstring.compressToUTF16(str) : str;
        }
        function unzip(str) {
            return lzstring ? lzstring.decompressFromUTF16(str) : str;
        }
        // Map the known libs to a node fetch promise, then return the contents
        function uncached() {
            return Promise.all(files.map(lib => fetchlike(prefix + lib).then(resp => resp.text()))).then(contents => {
                contents.forEach((text, index) => fsMap.set("/" + files[index], text));
            });
        }
        // A localstorage and lzzip aware version of the lib files
        function cached() {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                // Remove anything which isn't from this version
                if (key.startsWith("ts-lib-") && !key.startsWith("ts-lib-" + version)) {
                    storelike.removeItem(key);
                }
            });
            return Promise.all(files.map(lib => {
                const cacheKey = `ts-lib-${version}-${lib}`;
                const content = storelike.getItem(cacheKey);
                if (!content) {
                    // Make the API call and store the text concent in the cache
                    return fetchlike(prefix + lib)
                        .then(resp => resp.text())
                        .then(t => {
                        storelike.setItem(cacheKey, zip(t));
                        return t;
                    });
                }
                else {
                    return Promise.resolve(unzip(content));
                }
            })).then(contents => {
                contents.forEach((text, index) => {
                    const name = "/" + files[index];
                    fsMap.set(name, text);
                });
            });
        }
        const func = cache ? cached : uncached;
        return func().then(() => fsMap);
    };
    exports.createDefaultMapFromCDN = createDefaultMapFromCDN;
    function notImplemented(methodName) {
        throw new Error(`Method '${methodName}' is not implemented.`);
    }
    function audit(name, fn) {
        return (...args) => {
            const res = fn(...args);
            const smallres = typeof res === "string" ? res.slice(0, 80) + "..." : res;
            debugLog("> " + name, ...args);
            debugLog("< " + smallres);
            return res;
        };
    }
    /** The default compiler options if TypeScript could ever change the compiler options */
    const defaultCompilerOptions = (ts) => {
        return Object.assign(Object.assign({}, ts.getDefaultCompilerOptions()), { jsx: ts.JsxEmit.React, strict: true, esModuleInterop: true, module: ts.ModuleKind.ESNext, suppressOutputPathCheck: true, skipLibCheck: true, skipDefaultLibCheck: true, moduleResolution: ts.ModuleResolutionKind.NodeJs });
    };
    // "/DOM.d.ts" => "/lib.dom.d.ts"
    const libize = (path) => path.replace("/", "/lib.").toLowerCase();
    /**
     * Creates an in-memory System object which can be used in a TypeScript program, this
     * is what provides read/write aspects of the virtual fs
     */
    function createSystem(files) {
        return {
            args: [],
            createDirectory: () => notImplemented("createDirectory"),
            // TODO: could make a real file tree
            directoryExists: audit("directoryExists", directory => {
                return Array.from(files.keys()).some(path => path.startsWith(directory));
            }),
            exit: () => notImplemented("exit"),
            fileExists: audit("fileExists", fileName => files.has(fileName) || files.has(libize(fileName))),
            getCurrentDirectory: () => "/",
            getDirectories: () => [],
            getExecutingFilePath: () => notImplemented("getExecutingFilePath"),
            readDirectory: audit("readDirectory", directory => (directory === "/" ? Array.from(files.keys()) : [])),
            readFile: audit("readFile", fileName => files.get(fileName) || files.get(libize(fileName))),
            resolvePath: path => path,
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write: () => notImplemented("write"),
            writeFile: (fileName, contents) => {
                files.set(fileName, contents);
            },
        };
    }
    exports.createSystem = createSystem;
    /**
     * Creates a file-system backed System object which can be used in a TypeScript program, you provide
     * a set of virtual files which are prioritised over the FS versions, then a path to the root of your
     * project (basically the folder your node_modules lives)
     */
    function createFSBackedSystem(files, _projectRoot, ts) {
        // We need to make an isolated folder for the tsconfig, but also need to be able to resolve the
        // existing node_modules structures going back through the history
        const root = _projectRoot + "/vfs";
        const path = requirePath();
        // The default System in TypeScript
        const nodeSys = ts.sys;
        const tsLib = path.dirname(require.resolve("typescript"));
        return {
            // @ts-ignore
            name: "fs-vfs",
            root,
            args: [],
            createDirectory: () => notImplemented("createDirectory"),
            // TODO: could make a real file tree
            directoryExists: audit("directoryExists", directory => {
                return Array.from(files.keys()).some(path => path.startsWith(directory)) || nodeSys.directoryExists(directory);
            }),
            exit: nodeSys.exit,
            fileExists: audit("fileExists", fileName => {
                if (files.has(fileName))
                    return true;
                // Don't let other tsconfigs end up touching the vfs
                if (fileName.includes("tsconfig.json") || fileName.includes("tsconfig.json"))
                    return false;
                if (fileName.startsWith("/lib")) {
                    const tsLibName = `${tsLib}/${fileName.replace("/", "")}`;
                    return nodeSys.fileExists(tsLibName);
                }
                return nodeSys.fileExists(fileName);
            }),
            getCurrentDirectory: () => root,
            getDirectories: nodeSys.getDirectories,
            getExecutingFilePath: () => notImplemented("getExecutingFilePath"),
            readDirectory: audit("readDirectory", (...args) => {
                if (args[0] === "/") {
                    return Array.from(files.keys());
                }
                else {
                    return nodeSys.readDirectory(...args);
                }
            }),
            readFile: audit("readFile", fileName => {
                if (files.has(fileName))
                    return files.get(fileName);
                if (fileName.startsWith("/lib")) {
                    const tsLibName = `${tsLib}/${fileName.replace("/", "")}`;
                    const result = nodeSys.readFile(tsLibName);
                    if (!result) {
                        const libs = nodeSys.readDirectory(tsLib);
                        throw new Error(`TSVFS: A request was made for ${tsLibName} but there wasn't a file found in the file map. You likely have a mismatch in the compiler options for the CDN download vs the compiler program. Existing Libs: ${libs}.`);
                    }
                    return result;
                }
                return nodeSys.readFile(fileName);
            }),
            resolvePath: path => {
                if (files.has(path))
                    return path;
                return nodeSys.resolvePath(path);
            },
            newLine: "\n",
            useCaseSensitiveFileNames: true,
            write: () => notImplemented("write"),
            writeFile: (fileName, contents) => {
                files.set(fileName, contents);
            },
        };
    }
    exports.createFSBackedSystem = createFSBackedSystem;
    /**
     * Creates an in-memory CompilerHost -which is essentially an extra wrapper to System
     * which works with TypeScript objects - returns both a compiler host, and a way to add new SourceFile
     * instances to the in-memory file system.
     */
    function createVirtualCompilerHost(sys, compilerOptions, ts) {
        const sourceFiles = new Map();
        const save = (sourceFile) => {
            sourceFiles.set(sourceFile.fileName, sourceFile);
            return sourceFile;
        };
        const vHost = {
            compilerHost: Object.assign(Object.assign({}, sys), { getCanonicalFileName: fileName => fileName, getDefaultLibFileName: () => "/" + ts.getDefaultLibFileName(compilerOptions), 
                // getDefaultLibLocation: () => '/',
                getDirectories: () => [], getNewLine: () => sys.newLine, getSourceFile: fileName => {
                    return (sourceFiles.get(fileName) ||
                        save(ts.createSourceFile(fileName, sys.readFile(fileName), compilerOptions.target || defaultCompilerOptions(ts).target, false)));
                }, useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames }),
            updateFile: sourceFile => {
                const alreadyExists = sourceFiles.has(sourceFile.fileName);
                sys.writeFile(sourceFile.fileName, sourceFile.text);
                sourceFiles.set(sourceFile.fileName, sourceFile);
                return alreadyExists;
            },
        };
        return vHost;
    }
    exports.createVirtualCompilerHost = createVirtualCompilerHost;
    /**
     * Creates an object which can host a language service against the virtual file-system
     */
    function createVirtualLanguageServiceHost(sys, rootFiles, compilerOptions, ts, customTransformers) {
        const fileNames = [...rootFiles];
        const { compilerHost, updateFile } = createVirtualCompilerHost(sys, compilerOptions, ts);
        const fileVersions = new Map();
        let projectVersion = 0;
        const languageServiceHost = Object.assign(Object.assign({}, compilerHost), { getProjectVersion: () => projectVersion.toString(), getCompilationSettings: () => compilerOptions, getCustomTransformers: () => customTransformers, getScriptFileNames: () => fileNames, getScriptSnapshot: fileName => {
                const contents = sys.readFile(fileName);
                if (contents) {
                    return ts.ScriptSnapshot.fromString(contents);
                }
                return;
            }, getScriptVersion: fileName => {
                return fileVersions.get(fileName) || "0";
            }, writeFile: sys.writeFile });
        const lsHost = {
            languageServiceHost,
            updateFile: sourceFile => {
                projectVersion++;
                fileVersions.set(sourceFile.fileName, projectVersion.toString());
                if (!fileNames.includes(sourceFile.fileName)) {
                    fileNames.push(sourceFile.fileName);
                }
                updateFile(sourceFile);
            },
        };
        return lsHost;
    }
    exports.createVirtualLanguageServiceHost = createVirtualLanguageServiceHost;
    const requirePath = () => {
        return require(String.fromCharCode(112, 97, 116, 104));
    };
    const requireFS = () => {
        return require(String.fromCharCode(102, 115));
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXNjcmlwdC12ZnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zYW5kYm94L3NyYy92ZW5kb3IvdHlwZXNjcmlwdC12ZnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztJQVFBLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQTtJQUMzQixJQUFJO1FBQ0YsZUFBZSxHQUFHLE9BQU8sWUFBWSxLQUFLLFdBQVcsQ0FBQTtLQUN0RDtJQUFDLE9BQU8sS0FBSyxFQUFFLEdBQUU7SUFFbEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxPQUFPLEtBQUssV0FBVyxDQUFBO0lBQ2pELE1BQU0sV0FBVyxHQUFHLENBQUMsZUFBZSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzNHLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFjLEVBQUUsR0FBRyxlQUFzQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUE7SUFVOUY7Ozs7Ozs7OztPQVNHO0lBRUgsU0FBZ0Isa0NBQWtDLENBQ2hELEdBQVcsRUFDWCxTQUFtQixFQUNuQixFQUFNLEVBQ04sa0JBQW1DLEVBQUUsRUFDckMsa0JBQXVDO1FBRXZDLE1BQU0sa0JBQWtCLG1DQUFRLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxHQUFLLGVBQWUsQ0FBRSxDQUFBO1FBRWhGLE1BQU0sRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsR0FBRyxnQ0FBZ0MsQ0FDMUUsR0FBRyxFQUNILFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIsRUFBRSxFQUNGLGtCQUFrQixDQUNuQixDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFD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QUFBO2dCQUNoQixZQUFZLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQ2hFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDNUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7aUJBQ3BDO2dCQUNELFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN4QixDQUFDO1NBQ0YsQ0FBQTtRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2YsQ0FBQztJQS9DRCw0RUErQ0M7SUFFRCxNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUU7UUFDdkIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBMEIsQ0FBQTtJQUNqRixDQUFDLENBQUE7SUFFRCxNQUFNLFNBQVMsR0FBRyxHQUFHLEVBQUU7UUFDckIsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQXdCLENBQUE7SUFDdEUsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsidHlwZSBTeXN0ZW0gPSBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLlN5c3RlbVxudHlwZSBDb21waWxlck9wdGlvbnMgPSBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLkNvbXBpbGVyT3B0aW9uc1xudHlwZSBDdXN0b21UcmFuc2Zvcm1lcnMgPSBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLkN1c3RvbVRyYW5zZm9ybWVyc1xudHlwZSBMYW5ndWFnZVNlcnZpY2VIb3N0ID0gaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5MYW5ndWFnZVNlcnZpY2VIb3N0XG50eXBlIENvbXBpbGVySG9zdCA9IGltcG9ydChcInR5cGVzY3JpcHRcIikuQ29tcGlsZXJIb3N0XG50eXBlIFNvdXJjZUZpbGUgPSBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLlNvdXJjZUZpbGVcbnR5cGUgVFMgPSB0eXBlb2YgaW1wb3J0KFwidHlwZXNjcmlwdFwiKVxuXG5sZXQgaGFzTG9jYWxTdG9yYWdlID0gZmFsc2VcbnRyeSB7XG4gIGhhc0xvY2FsU3RvcmFnZSA9IHR5cGVvZiBsb2NhbFN0b3JhZ2UgIT09IGB1bmRlZmluZWRgXG59IGNhdGNoIChlcnJvcikge31cblxuY29uc3QgaGFzUHJvY2VzcyA9IHR5cGVvZiBwcm9jZXNzICE9PSBgdW5kZWZpbmVkYFxuY29uc3Qgc2hvdWxkRGVidWcgPSAoaGFzTG9jYWxTdG9yYWdlICYmIGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiREVCVUdcIikpIHx8IChoYXNQcm9jZXNzICYmIHByb2Nlc3MuZW52LkRFQlVHKVxuY29uc3QgZGVidWdMb2cgPSBzaG91bGREZWJ1ZyA/IGNvbnNvbGUubG9nIDogKF9tZXNzYWdlPzogYW55LCAuLi5fb3B0aW9uYWxQYXJhbXM6IGFueVtdKSA9PiBcIlwiXG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlydHVhbFR5cGVTY3JpcHRFbnZpcm9ubWVudCB7XG4gIHN5czogU3lzdGVtXG4gIGxhbmd1YWdlU2VydmljZTogaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5MYW5ndWFnZVNlcnZpY2VcbiAgZ2V0U291cmNlRmlsZTogKGZpbGVOYW1lOiBzdHJpbmcpID0+IGltcG9ydChcInR5cGVzY3JpcHRcIikuU291cmNlRmlsZSB8IHVuZGVmaW5lZFxuICBjcmVhdGVGaWxlOiAoZmlsZU5hbWU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkXG4gIHVwZGF0ZUZpbGU6IChmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIHJlcGxhY2VUZXh0U3Bhbj86IGltcG9ydChcInR5cGVzY3JpcHRcIikuVGV4dFNwYW4pID0+IHZvaWRcbn1cblxuLyoqXG4gKiBNYWtlcyBhIHZpcnR1YWwgY29weSBvZiB0aGUgVHlwZVNjcmlwdCBlbnZpcm9ubWVudC4gVGhpcyBpcyB0aGUgbWFpbiBBUEkgeW91IHdhbnQgdG8gYmUgdXNpbmcgd2l0aFxuICogQHR5cGVzY3JpcHQvdmZzLiBBIGxvdCBvZiB0aGUgb3RoZXIgZXhwb3NlZCBmdW5jdGlvbnMgYXJlIHVzZWQgYnkgdGhpcyBmdW5jdGlvbiB0byBnZXQgc2V0IHVwLlxuICpcbiAqIEBwYXJhbSBzeXMgYW4gb2JqZWN0IHdoaWNoIGNvbmZvcm1zIHRvIHRoZSBUUyBTeXMgKGEgc2hpbSBvdmVyIHJlYWQvd3JpdGUgYWNjZXNzIHRvIHRoZSBmcylcbiAqIEBwYXJhbSByb290RmlsZXMgYSBsaXN0IG9mIGZpbGVzIHdoaWNoIGFyZSBjb25zaWRlcmVkIGluc2lkZSB0aGUgcHJvamVjdFxuICogQHBhcmFtIHRzIGEgY29weSBwZiB0aGUgVHlwZVNjcmlwdCBtb2R1bGVcbiAqIEBwYXJhbSBjb21waWxlck9wdGlvbnMgdGhlIG9wdGlvbnMgZm9yIHRoaXMgY29tcGlsZXIgcnVuXG4gKiBAcGFyYW0gY3VzdG9tVHJhbnNmb3JtZXJzIGN1c3RvbSB0cmFuc2Zvcm1lcnMgZm9yIHRoaXMgY29tcGlsZXIgcnVuXG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZpcnR1YWxUeXBlU2NyaXB0RW52aXJvbm1lbnQoXG4gIHN5czogU3lzdGVtLFxuICByb290RmlsZXM6IHN0cmluZ1tdLFxuICB0czogVFMsXG4gIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zID0ge30sXG4gIGN1c3RvbVRyYW5zZm9ybWVycz86IEN1c3RvbVRyYW5zZm9ybWVyc1xuKTogVmlydHVhbFR5cGVTY3JpcHRFbnZpcm9ubWVudCB7XG4gIGNvbnN0IG1lcmdlZENvbXBpbGVyT3B0cyA9IHsgLi4uZGVmYXVsdENvbXBpbGVyT3B0aW9ucyh0cyksIC4uLmNvbXBpbGVyT3B0aW9ucyB9XG5cbiAgY29uc3QgeyBsYW5ndWFnZVNlcnZpY2VIb3N0LCB1cGRhdGVGaWxlIH0gPSBjcmVhdGVWaXJ0dWFsTGFuZ3VhZ2VTZXJ2aWNlSG9zdChcbiAgICBzeXMsXG4gICAgcm9vdEZpbGVzLFxuICAgIG1lcmdlZENvbXBpbGVyT3B0cyxcbiAgICB0cyxcbiAgICBjdXN0b21UcmFuc2Zvcm1lcnNcbiAgKVxuICBjb25zdCBsYW5ndWFnZVNlcnZpY2UgPSB0cy5jcmVhdGVMYW5ndWFnZVNlcnZpY2UobGFuZ3VhZ2VTZXJ2aWNlSG9zdClcbiAgY29uc3QgZGlhZ25vc3RpY3MgPSBsYW5ndWFnZVNlcnZpY2UuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKVxuXG4gIGlmIChkaWFnbm9zdGljcy5sZW5ndGgpIHtcbiAgICBjb25zdCBjb21waWxlckhvc3QgPSBjcmVhdGVWaXJ0dWFsQ29tcGlsZXJIb3N0KHN5cywgY29tcGlsZXJPcHRpb25zLCB0cylcbiAgICB0aHJvdyBuZXcgRXJyb3IodHMuZm9ybWF0RGlhZ25vc3RpY3MoZGlhZ25vc3RpY3MsIGNvbXBpbGVySG9zdC5jb21waWxlckhvc3QpKVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAvLyBAdHMtaWdub3JlXG4gICAgbmFtZTogXCJ2ZnNcIixcbiAgICBzeXMsXG4gICAgbGFuZ3VhZ2VTZXJ2aWNlLFxuICAgIGdldFNvdXJjZUZpbGU6IGZpbGVOYW1lID0+IGxhbmd1YWdlU2VydmljZS5nZXRQcm9ncmFtKCk/LmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpLFxuXG4gICAgY3JlYXRlRmlsZTogKGZpbGVOYW1lLCBjb250ZW50KSA9PiB7XG4gICAgICB1cGRhdGVGaWxlKHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZU5hbWUsIGNvbnRlbnQsIG1lcmdlZENvbXBpbGVyT3B0cy50YXJnZXQhLCBmYWxzZSkpXG4gICAgfSxcbiAgICB1cGRhdGVGaWxlOiAoZmlsZU5hbWUsIGNvbnRlbnQsIG9wdFByZXZUZXh0U3BhbikgPT4ge1xuICAgICAgY29uc3QgcHJldlNvdXJjZUZpbGUgPSBsYW5ndWFnZVNlcnZpY2UuZ2V0UHJvZ3JhbSgpIS5nZXRTb3VyY2VGaWxlKGZpbGVOYW1lKVxuICAgICAgaWYgKCFwcmV2U291cmNlRmlsZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaWQgbm90IGZpbmQgYSBzb3VyY2UgZmlsZSBmb3IgXCIgKyBmaWxlTmFtZSlcbiAgICAgIH1cbiAgICAgIGNvbnN0IHByZXZGdWxsQ29udGVudHMgPSBwcmV2U291cmNlRmlsZS50ZXh0XG5cbiAgICAgIC8vIFRPRE86IFZhbGlkYXRlIGlmIHRoZSBkZWZhdWx0IHRleHQgc3BhbiBoYXMgYSBmZW5jZXBvc3QgZXJyb3I/XG4gICAgICBjb25zdCBwcmV2VGV4dFNwYW4gPSBvcHRQcmV2VGV4dFNwYW4gPz8gdHMuY3JlYXRlVGV4dFNwYW4oMCwgcHJldkZ1bGxDb250ZW50cy5sZW5ndGgpXG4gICAgICBjb25zdCBuZXdUZXh0ID1cbiAgICAgICAgcHJldkZ1bGxDb250ZW50cy5zbGljZSgwLCBwcmV2VGV4dFNwYW4uc3RhcnQpICtcbiAgICAgICAgY29udGVudCArXG4gICAgICAgIHByZXZGdWxsQ29udGVudHMuc2xpY2UocHJldlRleHRTcGFuLnN0YXJ0ICsgcHJldlRleHRTcGFuLmxlbmd0aClcbiAgICAgIGNvbnN0IG5ld1NvdXJjZUZpbGUgPSB0cy51cGRhdGVTb3VyY2VGaWxlKHByZXZTb3VyY2VGaWxlLCBuZXdUZXh0LCB7XG4gICAgICAgIHNwYW46IHByZXZUZXh0U3BhbixcbiAgICAgICAgbmV3TGVuZ3RoOiBjb250ZW50Lmxlbmd0aCxcbiAgICAgIH0pXG5cbiAgICAgIHVwZGF0ZUZpbGUobmV3U291cmNlRmlsZSlcbiAgICB9LFxuICB9XG59XG5cbi8qKlxuICogR3JhYiB0aGUgbGlzdCBvZiBsaWIgZmlsZXMgZm9yIGEgcGFydGljdWxhciB0YXJnZXQsIHdpbGwgcmV0dXJuIGEgYml0IG1vcmUgdGhhbiBuZWNlc3NhcnkgKGJ5IGluY2x1ZGluZ1xuICogdGhlIGRvbSkgYnV0IHRoYXQncyBPS1xuICpcbiAqIEBwYXJhbSB0YXJnZXQgVGhlIGNvbXBpbGVyIHNldHRpbmdzIHRhcmdldCBiYXNlbGluZVxuICogQHBhcmFtIHRzIEEgY29weSBvZiB0aGUgVHlwZVNjcmlwdCBtb2R1bGVcbiAqL1xuZXhwb3J0IGNvbnN0IGtub3duTGliRmlsZXNGb3JDb21waWxlck9wdGlvbnMgPSAoY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHRzOiBUUykgPT4ge1xuICBjb25zdCB0YXJnZXQgPSBjb21waWxlck9wdGlvbnMudGFyZ2V0IHx8IHRzLlNjcmlwdFRhcmdldC5FUzVcbiAgY29uc3QgbGliID0gY29tcGlsZXJPcHRpb25zLmxpYiB8fCBbXVxuXG4gIGNvbnN0IGZpbGVzID0gW1xuICAgIFwibGliLmQudHNcIixcbiAgICBcImxpYi5kb20uZC50c1wiLFxuICAgIFwibGliLmRvbS5pdGVyYWJsZS5kLnRzXCIsXG4gICAgXCJsaWIud2Vid29ya2VyLmQudHNcIixcbiAgICBcImxpYi53ZWJ3b3JrZXIuaW1wb3J0c2NyaXB0cy5kLnRzXCIsXG4gICAgXCJsaWIuc2NyaXB0aG9zdC5kLnRzXCIsXG4gICAgXCJsaWIuZXM1LmQudHNcIixcbiAgICBcImxpYi5lczYuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNS5jb2xsZWN0aW9uLmQudHNcIixcbiAgICBcImxpYi5lczIwMTUuY29yZS5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE1LmQudHNcIixcbiAgICBcImxpYi5lczIwMTUuZ2VuZXJhdG9yLmQudHNcIixcbiAgICBcImxpYi5lczIwMTUuaXRlcmFibGUuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNS5wcm9taXNlLmQudHNcIixcbiAgICBcImxpYi5lczIwMTUucHJveHkuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNS5yZWZsZWN0LmQudHNcIixcbiAgICBcImxpYi5lczIwMTUuc3ltYm9sLmQudHNcIixcbiAgICBcImxpYi5lczIwMTUuc3ltYm9sLndlbGxrbm93bi5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE2LmFycmF5LmluY2x1ZGUuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNi5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE2LmZ1bGwuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNy5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE3LmZ1bGwuZC50c1wiLFxuICAgIFwibGliLmVzMjAxNy5pbnRsLmQudHNcIixcbiAgICBcImxpYi5lczIwMTcub2JqZWN0LmQudHNcIixcbiAgICBcImxpYi5lczIwMTcuc2hhcmVkbWVtb3J5LmQudHNcIixcbiAgICBcImxpYi5lczIwMTcuc3RyaW5nLmQudHNcIixcbiAgICBcImxpYi5lczIwMTcudHlwZWRhcnJheXMuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOC5hc3luY2dlbmVyYXRvci5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE4LmFzeW5jaXRlcmFibGUuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE4LmZ1bGwuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOC5pbnRsLmQudHNcIixcbiAgICBcImxpYi5lczIwMTgucHJvbWlzZS5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE4LnJlZ2V4cC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDE5LmFycmF5LmQudHNcIixcbiAgICBcImxpYi5lczIwMTkuZC50c1wiLFxuICAgIFwibGliLmVzMjAxOS5mdWxsLmQudHNcIixcbiAgICBcImxpYi5lczIwMTkub2JqZWN0LmQudHNcIixcbiAgICBcImxpYi5lczIwMTkuc3RyaW5nLmQudHNcIixcbiAgICBcImxpYi5lczIwMTkuc3ltYm9sLmQudHNcIixcbiAgICBcImxpYi5lczIwMjAuZC50c1wiLFxuICAgIFwibGliLmVzMjAyMC5mdWxsLmQudHNcIixcbiAgICBcImxpYi5lczIwMjAuc3RyaW5nLmQudHNcIixcbiAgICBcImxpYi5lczIwMjAuc3ltYm9sLndlbGxrbm93bi5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDIwLmJpZ2ludC5kLnRzXCIsXG4gICAgXCJsaWIuZXMyMDIwLnByb21pc2UuZC50c1wiLFxuICAgIFwibGliLmVzMjAyMC5zaGFyZWRtZW1vcnkuZC50c1wiLFxuICAgIFwibGliLmVzMjAyMC5pbnRsLmQudHNcIixcbiAgICBcImxpYi5lc25leHQuYXJyYXkuZC50c1wiLFxuICAgIFwibGliLmVzbmV4dC5hc3luY2l0ZXJhYmxlLmQudHNcIixcbiAgICBcImxpYi5lc25leHQuYmlnaW50LmQudHNcIixcbiAgICBcImxpYi5lc25leHQuZC50c1wiLFxuICAgIFwibGliLmVzbmV4dC5mdWxsLmQudHNcIixcbiAgICBcImxpYi5lc25leHQuaW50bC5kLnRzXCIsXG4gICAgXCJsaWIuZXNuZXh0LnN5bWJvbC5kLnRzXCIsXG4gIF1cblxuICBjb25zdCB0YXJnZXRUb0N1dCA9IHRzLlNjcmlwdFRhcmdldFt0YXJnZXRdXG4gIGNvbnN0IG1hdGNoZXMgPSBmaWxlcy5maWx0ZXIoZiA9PiBmLnN0YXJ0c1dpdGgoYGxpYi4ke3RhcmdldFRvQ3V0LnRvTG93ZXJDYXNlKCl9YCkpXG4gIGNvbnN0IHRhcmdldEN1dEluZGV4ID0gZmlsZXMuaW5kZXhPZihtYXRjaGVzLnBvcCgpISlcblxuICBjb25zdCBnZXRNYXggPSAoYXJyYXk6IG51bWJlcltdKSA9PlxuICAgIGFycmF5ICYmIGFycmF5Lmxlbmd0aCA/IGFycmF5LnJlZHVjZSgobWF4LCBjdXJyZW50KSA9PiAoY3VycmVudCA+IG1heCA/IGN1cnJlbnQgOiBtYXgpKSA6IHVuZGVmaW5lZFxuXG4gIC8vIEZpbmQgdGhlIGluZGV4IGZvciBldmVyeXRoaW5nIGluXG4gIGNvbnN0IGluZGV4ZXNGb3JDdXR0aW5nID0gbGliLm1hcChsaWIgPT4ge1xuICAgIGNvbnN0IG1hdGNoZXMgPSBmaWxlcy5maWx0ZXIoZiA9PiBmLnN0YXJ0c1dpdGgoYGxpYi4ke2xpYi50b0xvd2VyQ2FzZSgpfWApKVxuICAgIGlmIChtYXRjaGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAgIGNvbnN0IGN1dEluZGV4ID0gZmlsZXMuaW5kZXhPZihtYXRjaGVzLnBvcCgpISlcbiAgICByZXR1cm4gY3V0SW5kZXhcbiAgfSlcblxuICBjb25zdCBsaWJDdXRJbmRleCA9IGdldE1heChpbmRleGVzRm9yQ3V0dGluZykgfHwgMFxuXG4gIGNvbnN0IGZpbmFsQ3V0SW5kZXggPSBNYXRoLm1heCh0YXJnZXRDdXRJbmRleCwgbGliQ3V0SW5kZXgpXG4gIHJldHVybiBmaWxlcy5zbGljZSgwLCBmaW5hbEN1dEluZGV4ICsgMSlcbn1cblxuLyoqXG4gKiBTZXRzIHVwIGEgTWFwIHdpdGggbGliIGNvbnRlbnRzIGJ5IGdyYWJiaW5nIHRoZSBuZWNlc3NhcnkgZmlsZXMgZnJvbVxuICogdGhlIGxvY2FsIGNvcHkgb2YgdHlwZXNjcmlwdCB2aWEgdGhlIGZpbGUgc3lzdGVtLlxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlRGVmYXVsdE1hcEZyb21Ob2RlTW9kdWxlcyA9IChjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgdHM/OiB0eXBlb2YgaW1wb3J0KFwidHlwZXNjcmlwdFwiKSkgPT4ge1xuICBjb25zdCB0c01vZHVsZSA9IHRzIHx8IHJlcXVpcmUoXCJ0eXBlc2NyaXB0XCIpXG4gIGNvbnN0IHBhdGggPSByZXF1aXJlUGF0aCgpXG4gIGNvbnN0IGZzID0gcmVxdWlyZUZTKClcblxuICBjb25zdCBnZXRMaWIgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbGliID0gcGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZShcInR5cGVzY3JpcHRcIikpXG4gICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4obGliLCBuYW1lKSwgXCJ1dGY4XCIpXG4gIH1cblxuICBjb25zdCBsaWJzID0ga25vd25MaWJGaWxlc0ZvckNvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMsIHRzTW9kdWxlKVxuICBjb25zdCBmc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcbiAgbGlicy5mb3JFYWNoKGxpYiA9PiB7XG4gICAgZnNNYXAuc2V0KFwiL1wiICsgbGliLCBnZXRMaWIobGliKSlcbiAgfSlcbiAgcmV0dXJuIGZzTWFwXG59XG5cbi8qKlxuICogQWRkcyByZWN1cnNpdmVseSBmaWxlcyBmcm9tIHRoZSBGUyBpbnRvIHRoZSBtYXAgYmFzZWQgb24gdGhlIGZvbGRlclxuICovXG5leHBvcnQgY29uc3QgYWRkQWxsRmlsZXNGcm9tRm9sZGVyID0gKG1hcDogTWFwPHN0cmluZywgc3RyaW5nPiwgd29ya2luZ0Rpcjogc3RyaW5nKTogdm9pZCA9PiB7XG4gIGNvbnN0IHBhdGggPSByZXF1aXJlUGF0aCgpXG4gIGNvbnN0IGZzID0gcmVxdWlyZUZTKClcblxuICBjb25zdCB3YWxrID0gZnVuY3Rpb24gKGRpcjogc3RyaW5nKSB7XG4gICAgbGV0IHJlc3VsdHM6IHN0cmluZ1tdID0gW11cbiAgICBjb25zdCBsaXN0ID0gZnMucmVhZGRpclN5bmMoZGlyKVxuICAgIGxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZmlsZTogc3RyaW5nKSB7XG4gICAgICBmaWxlID0gcGF0aC5qb2luKGRpciwgZmlsZSlcbiAgICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlKVxuICAgICAgaWYgKHN0YXQgJiYgc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIC8qIFJlY3Vyc2UgaW50byBhIHN1YmRpcmVjdG9yeSAqL1xuICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQod2FsayhmaWxlKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8qIElzIGEgZmlsZSAqL1xuICAgICAgICByZXN1bHRzLnB1c2goZmlsZSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiByZXN1bHRzXG4gIH1cblxuICBjb25zdCBhbGxGaWxlcyA9IHdhbGsod29ya2luZ0RpcilcblxuICBhbGxGaWxlcy5mb3JFYWNoKGxpYiA9PiB7XG4gICAgY29uc3QgZnNQYXRoID0gXCIvbm9kZV9tb2R1bGVzL0B0eXBlc1wiICsgbGliLnJlcGxhY2Uod29ya2luZ0RpciwgXCJcIilcbiAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGxpYiwgXCJ1dGY4XCIpXG4gICAgY29uc3QgdmFsaWRFeHRlbnNpb25zID0gW1wiLnRzXCIsIFwiLnRzeFwiXVxuXG4gICAgaWYgKHZhbGlkRXh0ZW5zaW9ucy5pbmNsdWRlcyhwYXRoLmV4dG5hbWUoZnNQYXRoKSkpIHtcbiAgICAgIG1hcC5zZXQoZnNQYXRoLCBjb250ZW50KVxuICAgIH1cbiAgfSlcbn1cblxuLyoqIEFkZHMgYWxsIGZpbGVzIGZyb20gbm9kZV9tb2R1bGVzL0B0eXBlcyBpbnRvIHRoZSBGUyBNYXAgKi9cbmV4cG9ydCBjb25zdCBhZGRGaWxlc0ZvclR5cGVzSW50b0ZvbGRlciA9IChtYXA6IE1hcDxzdHJpbmcsIHN0cmluZz4pID0+XG4gIGFkZEFsbEZpbGVzRnJvbUZvbGRlcihtYXAsIFwibm9kZV9tb2R1bGVzL0B0eXBlc1wiKVxuXG4vKipcbiAqIENyZWF0ZSBhIHZpcnR1YWwgRlMgTWFwIHdpdGggdGhlIGxpYiBmaWxlcyBmcm9tIGEgcGFydGljdWxhciBUeXBlU2NyaXB0XG4gKiB2ZXJzaW9uIGJhc2VkIG9uIHRoZSB0YXJnZXQsIEFsd2F5cyBpbmNsdWRlcyBkb20gQVRNLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zIFRoZSBjb21waWxlciB0YXJnZXQsIHdoaWNoIGRpY3RhdGVzIHRoZSBsaWJzIHRvIHNldCB1cFxuICogQHBhcmFtIHZlcnNpb24gdGhlIHZlcnNpb25zIG9mIFR5cGVTY3JpcHQgd2hpY2ggYXJlIHN1cHBvcnRlZFxuICogQHBhcmFtIGNhY2hlIHNob3VsZCB0aGUgdmFsdWVzIGJlIHN0b3JlZCBpbiBsb2NhbCBzdG9yYWdlXG4gKiBAcGFyYW0gdHMgYSBjb3B5IG9mIHRoZSB0eXBlc2NyaXB0IGltcG9ydFxuICogQHBhcmFtIGx6c3RyaW5nIGFuIG9wdGlvbmFsIGNvcHkgb2YgdGhlIGx6LXN0cmluZyBpbXBvcnRcbiAqIEBwYXJhbSBmZXRjaGVyIGFuIG9wdGlvbmFsIHJlcGxhY2VtZW50IGZvciB0aGUgZ2xvYmFsIGZldGNoIGZ1bmN0aW9uICh0ZXN0cyBtYWlubHkpXG4gKiBAcGFyYW0gc3RvcmVyIGFuIG9wdGlvbmFsIHJlcGxhY2VtZW50IGZvciB0aGUgbG9jYWxTdG9yYWdlIGdsb2JhbCAodGVzdHMgbWFpbmx5KVxuICovXG5leHBvcnQgY29uc3QgY3JlYXRlRGVmYXVsdE1hcEZyb21DRE4gPSAoXG4gIG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgdmVyc2lvbjogc3RyaW5nLFxuICBjYWNoZTogYm9vbGVhbixcbiAgdHM6IFRTLFxuICBsenN0cmluZz86IHR5cGVvZiBpbXBvcnQoXCJsei1zdHJpbmdcIiksXG4gIGZldGNoZXI/OiB0eXBlb2YgZmV0Y2gsXG4gIHN0b3Jlcj86IHR5cGVvZiBsb2NhbFN0b3JhZ2VcbikgPT4ge1xuICBjb25zdCBmZXRjaGxpa2UgPSBmZXRjaGVyIHx8IGZldGNoXG4gIGNvbnN0IHN0b3JlbGlrZSA9IHN0b3JlciB8fCBsb2NhbFN0b3JhZ2VcbiAgY29uc3QgZnNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG4gIGNvbnN0IGZpbGVzID0ga25vd25MaWJGaWxlc0ZvckNvbXBpbGVyT3B0aW9ucyhvcHRpb25zLCB0cylcbiAgY29uc3QgcHJlZml4ID0gYGh0dHBzOi8vdHlwZXNjcmlwdC5henVyZWVkZ2UubmV0L2Nkbi8ke3ZlcnNpb259L3R5cGVzY3JpcHQvbGliL2BcblxuICBmdW5jdGlvbiB6aXAoc3RyOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gbHpzdHJpbmcgPyBsenN0cmluZy5jb21wcmVzc1RvVVRGMTYoc3RyKSA6IHN0clxuICB9XG5cbiAgZnVuY3Rpb24gdW56aXAoc3RyOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gbHpzdHJpbmcgPyBsenN0cmluZy5kZWNvbXByZXNzRnJvbVVURjE2KHN0cikgOiBzdHJcbiAgfVxuXG4gIC8vIE1hcCB0aGUga25vd24gbGlicyB0byBhIG5vZGUgZmV0Y2ggcHJvbWlzZSwgdGhlbiByZXR1cm4gdGhlIGNvbnRlbnRzXG4gIGZ1bmN0aW9uIHVuY2FjaGVkKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChmaWxlcy5tYXAobGliID0+IGZldGNobGlrZShwcmVmaXggKyBsaWIpLnRoZW4ocmVzcCA9PiByZXNwLnRleHQoKSkpKS50aGVuKGNvbnRlbnRzID0+IHtcbiAgICAgIGNvbnRlbnRzLmZvckVhY2goKHRleHQsIGluZGV4KSA9PiBmc01hcC5zZXQoXCIvXCIgKyBmaWxlc1tpbmRleF0sIHRleHQpKVxuICAgIH0pXG4gIH1cblxuICAvLyBBIGxvY2Fsc3RvcmFnZSBhbmQgbHp6aXAgYXdhcmUgdmVyc2lvbiBvZiB0aGUgbGliIGZpbGVzXG4gIGZ1bmN0aW9uIGNhY2hlZCgpIHtcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobG9jYWxTdG9yYWdlKVxuICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgLy8gUmVtb3ZlIGFueXRoaW5nIHdoaWNoIGlzbid0IGZyb20gdGhpcyB2ZXJzaW9uXG4gICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoXCJ0cy1saWItXCIpICYmICFrZXkuc3RhcnRzV2l0aChcInRzLWxpYi1cIiArIHZlcnNpb24pKSB7XG4gICAgICAgIHN0b3JlbGlrZS5yZW1vdmVJdGVtKGtleSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFxuICAgICAgZmlsZXMubWFwKGxpYiA9PiB7XG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gYHRzLWxpYi0ke3ZlcnNpb259LSR7bGlifWBcbiAgICAgICAgY29uc3QgY29udGVudCA9IHN0b3JlbGlrZS5nZXRJdGVtKGNhY2hlS2V5KVxuXG4gICAgICAgIGlmICghY29udGVudCkge1xuICAgICAgICAgIC8vIE1ha2UgdGhlIEFQSSBjYWxsIGFuZCBzdG9yZSB0aGUgdGV4dCBjb25jZW50IGluIHRoZSBjYWNoZVxuICAgICAgICAgIHJldHVybiBmZXRjaGxpa2UocHJlZml4ICsgbGliKVxuICAgICAgICAgICAgLnRoZW4ocmVzcCA9PiByZXNwLnRleHQoKSlcbiAgICAgICAgICAgIC50aGVuKHQgPT4ge1xuICAgICAgICAgICAgICBzdG9yZWxpa2Uuc2V0SXRlbShjYWNoZUtleSwgemlwKHQpKVxuICAgICAgICAgICAgICByZXR1cm4gdFxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVuemlwKGNvbnRlbnQpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICkudGhlbihjb250ZW50cyA9PiB7XG4gICAgICBjb250ZW50cy5mb3JFYWNoKCh0ZXh0LCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gXCIvXCIgKyBmaWxlc1tpbmRleF1cbiAgICAgICAgZnNNYXAuc2V0KG5hbWUsIHRleHQpXG4gICAgICB9KVxuICAgIH0pXG4gIH1cblxuICBjb25zdCBmdW5jID0gY2FjaGUgPyBjYWNoZWQgOiB1bmNhY2hlZFxuICByZXR1cm4gZnVuYygpLnRoZW4oKCkgPT4gZnNNYXApXG59XG5cbmZ1bmN0aW9uIG5vdEltcGxlbWVudGVkKG1ldGhvZE5hbWU6IHN0cmluZyk6IGFueSB7XG4gIHRocm93IG5ldyBFcnJvcihgTWV0aG9kICcke21ldGhvZE5hbWV9JyBpcyBub3QgaW1wbGVtZW50ZWQuYClcbn1cblxuZnVuY3Rpb24gYXVkaXQ8QXJnc1QgZXh0ZW5kcyBhbnlbXSwgUmV0dXJuVD4oXG4gIG5hbWU6IHN0cmluZyxcbiAgZm46ICguLi5hcmdzOiBBcmdzVCkgPT4gUmV0dXJuVFxuKTogKC4uLmFyZ3M6IEFyZ3NUKSA9PiBSZXR1cm5UIHtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgY29uc3QgcmVzID0gZm4oLi4uYXJncylcblxuICAgIGNvbnN0IHNtYWxscmVzID0gdHlwZW9mIHJlcyA9PT0gXCJzdHJpbmdcIiA/IHJlcy5zbGljZSgwLCA4MCkgKyBcIi4uLlwiIDogcmVzXG4gICAgZGVidWdMb2coXCI+IFwiICsgbmFtZSwgLi4uYXJncylcbiAgICBkZWJ1Z0xvZyhcIjwgXCIgKyBzbWFsbHJlcylcblxuICAgIHJldHVybiByZXNcbiAgfVxufVxuXG4vKiogVGhlIGRlZmF1bHQgY29tcGlsZXIgb3B0aW9ucyBpZiBUeXBlU2NyaXB0IGNvdWxkIGV2ZXIgY2hhbmdlIHRoZSBjb21waWxlciBvcHRpb25zICovXG5jb25zdCBkZWZhdWx0Q29tcGlsZXJPcHRpb25zID0gKHRzOiB0eXBlb2YgaW1wb3J0KFwidHlwZXNjcmlwdFwiKSk6IENvbXBpbGVyT3B0aW9ucyA9PiB7XG4gIHJldHVybiB7XG4gICAgLi4udHMuZ2V0RGVmYXVsdENvbXBpbGVyT3B0aW9ucygpLFxuICAgIGpzeDogdHMuSnN4RW1pdC5SZWFjdCxcbiAgICBzdHJpY3Q6IHRydWUsXG4gICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuICAgIG1vZHVsZTogdHMuTW9kdWxlS2luZC5FU05leHQsXG4gICAgc3VwcHJlc3NPdXRwdXRQYXRoQ2hlY2s6IHRydWUsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIHNraXBEZWZhdWx0TGliQ2hlY2s6IHRydWUsXG4gICAgbW9kdWxlUmVzb2x1dGlvbjogdHMuTW9kdWxlUmVzb2x1dGlvbktpbmQuTm9kZUpzLFxuICB9XG59XG5cbi8vIFwiL0RPTS5kLnRzXCIgPT4gXCIvbGliLmRvbS5kLnRzXCJcbmNvbnN0IGxpYml6ZSA9IChwYXRoOiBzdHJpbmcpID0+IHBhdGgucmVwbGFjZShcIi9cIiwgXCIvbGliLlwiKS50b0xvd2VyQ2FzZSgpXG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbi1tZW1vcnkgU3lzdGVtIG9iamVjdCB3aGljaCBjYW4gYmUgdXNlZCBpbiBhIFR5cGVTY3JpcHQgcHJvZ3JhbSwgdGhpc1xuICogaXMgd2hhdCBwcm92aWRlcyByZWFkL3dyaXRlIGFzcGVjdHMgb2YgdGhlIHZpcnR1YWwgZnNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN5c3RlbShmaWxlczogTWFwPHN0cmluZywgc3RyaW5nPik6IFN5c3RlbSB7XG4gIHJldHVybiB7XG4gICAgYXJnczogW10sXG4gICAgY3JlYXRlRGlyZWN0b3J5OiAoKSA9PiBub3RJbXBsZW1lbnRlZChcImNyZWF0ZURpcmVjdG9yeVwiKSxcbiAgICAvLyBUT0RPOiBjb3VsZCBtYWtlIGEgcmVhbCBmaWxlIHRyZWVcbiAgICBkaXJlY3RvcnlFeGlzdHM6IGF1ZGl0KFwiZGlyZWN0b3J5RXhpc3RzXCIsIGRpcmVjdG9yeSA9PiB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShmaWxlcy5rZXlzKCkpLnNvbWUocGF0aCA9PiBwYXRoLnN0YXJ0c1dpdGgoZGlyZWN0b3J5KSlcbiAgICB9KSxcbiAgICBleGl0OiAoKSA9PiBub3RJbXBsZW1lbnRlZChcImV4aXRcIiksXG4gICAgZmlsZUV4aXN0czogYXVkaXQoXCJmaWxlRXhpc3RzXCIsIGZpbGVOYW1lID0+IGZpbGVzLmhhcyhmaWxlTmFtZSkgfHwgZmlsZXMuaGFzKGxpYml6ZShmaWxlTmFtZSkpKSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBcIi9cIixcbiAgICBnZXREaXJlY3RvcmllczogKCkgPT4gW10sXG4gICAgZ2V0RXhlY3V0aW5nRmlsZVBhdGg6ICgpID0+IG5vdEltcGxlbWVudGVkKFwiZ2V0RXhlY3V0aW5nRmlsZVBhdGhcIiksXG4gICAgcmVhZERpcmVjdG9yeTogYXVkaXQoXCJyZWFkRGlyZWN0b3J5XCIsIGRpcmVjdG9yeSA9PiAoZGlyZWN0b3J5ID09PSBcIi9cIiA/IEFycmF5LmZyb20oZmlsZXMua2V5cygpKSA6IFtdKSksXG4gICAgcmVhZEZpbGU6IGF1ZGl0KFwicmVhZEZpbGVcIiwgZmlsZU5hbWUgPT4gZmlsZXMuZ2V0KGZpbGVOYW1lKSB8fCBmaWxlcy5nZXQobGliaXplKGZpbGVOYW1lKSkpLFxuICAgIHJlc29sdmVQYXRoOiBwYXRoID0+IHBhdGgsXG4gICAgbmV3TGluZTogXCJcXG5cIixcbiAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiB0cnVlLFxuICAgIHdyaXRlOiAoKSA9PiBub3RJbXBsZW1lbnRlZChcIndyaXRlXCIpLFxuICAgIHdyaXRlRmlsZTogKGZpbGVOYW1lLCBjb250ZW50cykgPT4ge1xuICAgICAgZmlsZXMuc2V0KGZpbGVOYW1lLCBjb250ZW50cylcbiAgICB9LFxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZpbGUtc3lzdGVtIGJhY2tlZCBTeXN0ZW0gb2JqZWN0IHdoaWNoIGNhbiBiZSB1c2VkIGluIGEgVHlwZVNjcmlwdCBwcm9ncmFtLCB5b3UgcHJvdmlkZVxuICogYSBzZXQgb2YgdmlydHVhbCBmaWxlcyB3aGljaCBhcmUgcHJpb3JpdGlzZWQgb3ZlciB0aGUgRlMgdmVyc2lvbnMsIHRoZW4gYSBwYXRoIHRvIHRoZSByb290IG9mIHlvdXJcbiAqIHByb2plY3QgKGJhc2ljYWxseSB0aGUgZm9sZGVyIHlvdXIgbm9kZV9tb2R1bGVzIGxpdmVzKVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRlNCYWNrZWRTeXN0ZW0oZmlsZXM6IE1hcDxzdHJpbmcsIHN0cmluZz4sIF9wcm9qZWN0Um9vdDogc3RyaW5nLCB0czogVFMpOiBTeXN0ZW0ge1xuICAvLyBXZSBuZWVkIHRvIG1ha2UgYW4gaXNvbGF0ZWQgZm9sZGVyIGZvciB0aGUgdHNjb25maWcsIGJ1dCBhbHNvIG5lZWQgdG8gYmUgYWJsZSB0byByZXNvbHZlIHRoZVxuICAvLyBleGlzdGluZyBub2RlX21vZHVsZXMgc3RydWN0dXJlcyBnb2luZyBiYWNrIHRocm91Z2ggdGhlIGhpc3RvcnlcbiAgY29uc3Qgcm9vdCA9IF9wcm9qZWN0Um9vdCArIFwiL3Zmc1wiXG4gIGNvbnN0IHBhdGggPSByZXF1aXJlUGF0aCgpXG5cbiAgLy8gVGhlIGRlZmF1bHQgU3lzdGVtIGluIFR5cGVTY3JpcHRcbiAgY29uc3Qgbm9kZVN5cyA9IHRzLnN5c1xuICBjb25zdCB0c0xpYiA9IHBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoXCJ0eXBlc2NyaXB0XCIpKVxuXG4gIHJldHVybiB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIG5hbWU6IFwiZnMtdmZzXCIsXG4gICAgcm9vdCxcbiAgICBhcmdzOiBbXSxcbiAgICBjcmVhdGVEaXJlY3Rvcnk6ICgpID0+IG5vdEltcGxlbWVudGVkKFwiY3JlYXRlRGlyZWN0b3J5XCIpLFxuICAgIC8vIFRPRE86IGNvdWxkIG1ha2UgYSByZWFsIGZpbGUgdHJlZVxuICAgIGRpcmVjdG9yeUV4aXN0czogYXVkaXQoXCJkaXJlY3RvcnlFeGlzdHNcIiwgZGlyZWN0b3J5ID0+IHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKGZpbGVzLmtleXMoKSkuc29tZShwYXRoID0+IHBhdGguc3RhcnRzV2l0aChkaXJlY3RvcnkpKSB8fCBub2RlU3lzLmRpcmVjdG9yeUV4aXN0cyhkaXJlY3RvcnkpXG4gICAgfSksXG4gICAgZXhpdDogbm9kZVN5cy5leGl0LFxuICAgIGZpbGVFeGlzdHM6IGF1ZGl0KFwiZmlsZUV4aXN0c1wiLCBmaWxlTmFtZSA9PiB7XG4gICAgICBpZiAoZmlsZXMuaGFzKGZpbGVOYW1lKSkgcmV0dXJuIHRydWVcbiAgICAgIC8vIERvbid0IGxldCBvdGhlciB0c2NvbmZpZ3MgZW5kIHVwIHRvdWNoaW5nIHRoZSB2ZnNcbiAgICAgIGlmIChmaWxlTmFtZS5pbmNsdWRlcyhcInRzY29uZmlnLmpzb25cIikgfHwgZmlsZU5hbWUuaW5jbHVkZXMoXCJ0c2NvbmZpZy5qc29uXCIpKSByZXR1cm4gZmFsc2VcbiAgICAgIGlmIChmaWxlTmFtZS5zdGFydHNXaXRoKFwiL2xpYlwiKSkge1xuICAgICAgICBjb25zdCB0c0xpYk5hbWUgPSBgJHt0c0xpYn0vJHtmaWxlTmFtZS5yZXBsYWNlKFwiL1wiLCBcIlwiKX1gXG4gICAgICAgIHJldHVybiBub2RlU3lzLmZpbGVFeGlzdHModHNMaWJOYW1lKVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGVTeXMuZmlsZUV4aXN0cyhmaWxlTmFtZSlcbiAgICB9KSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiByb290LFxuICAgIGdldERpcmVjdG9yaWVzOiBub2RlU3lzLmdldERpcmVjdG9yaWVzLFxuICAgIGdldEV4ZWN1dGluZ0ZpbGVQYXRoOiAoKSA9PiBub3RJbXBsZW1lbnRlZChcImdldEV4ZWN1dGluZ0ZpbGVQYXRoXCIpLFxuICAgIHJlYWREaXJlY3Rvcnk6IGF1ZGl0KFwicmVhZERpcmVjdG9yeVwiLCAoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKGFyZ3NbMF0gPT09IFwiL1wiKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGZpbGVzLmtleXMoKSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBub2RlU3lzLnJlYWREaXJlY3RvcnkoLi4uYXJncylcbiAgICAgIH1cbiAgICB9KSxcbiAgICByZWFkRmlsZTogYXVkaXQoXCJyZWFkRmlsZVwiLCBmaWxlTmFtZSA9PiB7XG4gICAgICBpZiAoZmlsZXMuaGFzKGZpbGVOYW1lKSkgcmV0dXJuIGZpbGVzLmdldChmaWxlTmFtZSlcbiAgICAgIGlmIChmaWxlTmFtZS5zdGFydHNXaXRoKFwiL2xpYlwiKSkge1xuICAgICAgICBjb25zdCB0c0xpYk5hbWUgPSBgJHt0c0xpYn0vJHtmaWxlTmFtZS5yZXBsYWNlKFwiL1wiLCBcIlwiKX1gXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5vZGVTeXMucmVhZEZpbGUodHNMaWJOYW1lKVxuICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgIGNvbnN0IGxpYnMgPSBub2RlU3lzLnJlYWREaXJlY3RvcnkodHNMaWIpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYFRTVkZTOiBBIHJlcXVlc3Qgd2FzIG1hZGUgZm9yICR7dHNMaWJOYW1lfSBidXQgdGhlcmUgd2Fzbid0IGEgZmlsZSBmb3VuZCBpbiB0aGUgZmlsZSBtYXAuIFlvdSBsaWtlbHkgaGF2ZSBhIG1pc21hdGNoIGluIHRoZSBjb21waWxlciBvcHRpb25zIGZvciB0aGUgQ0ROIGRvd25sb2FkIHZzIHRoZSBjb21waWxlciBwcm9ncmFtLiBFeGlzdGluZyBMaWJzOiAke2xpYnN9LmBcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGVTeXMucmVhZEZpbGUoZmlsZU5hbWUpXG4gICAgfSksXG4gICAgcmVzb2x2ZVBhdGg6IHBhdGggPT4ge1xuICAgICAgaWYgKGZpbGVzLmhhcyhwYXRoKSkgcmV0dXJuIHBhdGhcbiAgICAgIHJldHVybiBub2RlU3lzLnJlc29sdmVQYXRoKHBhdGgpXG4gICAgfSxcbiAgICBuZXdMaW5lOiBcIlxcblwiLFxuICAgIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXM6IHRydWUsXG4gICAgd3JpdGU6ICgpID0+IG5vdEltcGxlbWVudGVkKFwid3JpdGVcIiksXG4gICAgd3JpdGVGaWxlOiAoZmlsZU5hbWUsIGNvbnRlbnRzKSA9PiB7XG4gICAgICBmaWxlcy5zZXQoZmlsZU5hbWUsIGNvbnRlbnRzKVxuICAgIH0sXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIGluLW1lbW9yeSBDb21waWxlckhvc3QgLXdoaWNoIGlzIGVzc2VudGlhbGx5IGFuIGV4dHJhIHdyYXBwZXIgdG8gU3lzdGVtXG4gKiB3aGljaCB3b3JrcyB3aXRoIFR5cGVTY3JpcHQgb2JqZWN0cyAtIHJldHVybnMgYm90aCBhIGNvbXBpbGVyIGhvc3QsIGFuZCBhIHdheSB0byBhZGQgbmV3IFNvdXJjZUZpbGVcbiAqIGluc3RhbmNlcyB0byB0aGUgaW4tbWVtb3J5IGZpbGUgc3lzdGVtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXM6IFN5c3RlbSwgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIHRzOiBUUykge1xuICBjb25zdCBzb3VyY2VGaWxlcyA9IG5ldyBNYXA8c3RyaW5nLCBTb3VyY2VGaWxlPigpXG4gIGNvbnN0IHNhdmUgPSAoc291cmNlRmlsZTogU291cmNlRmlsZSkgPT4ge1xuICAgIHNvdXJjZUZpbGVzLnNldChzb3VyY2VGaWxlLmZpbGVOYW1lLCBzb3VyY2VGaWxlKVxuICAgIHJldHVybiBzb3VyY2VGaWxlXG4gIH1cblxuICB0eXBlIFJldHVybiA9IHtcbiAgICBjb21waWxlckhvc3Q6IENvbXBpbGVySG9zdFxuICAgIHVwZGF0ZUZpbGU6IChzb3VyY2VGaWxlOiBTb3VyY2VGaWxlKSA9PiBib29sZWFuXG4gIH1cblxuICBjb25zdCB2SG9zdDogUmV0dXJuID0ge1xuICAgIGNvbXBpbGVySG9zdDoge1xuICAgICAgLi4uc3lzLFxuICAgICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiBcIi9cIiArIHRzLmdldERlZmF1bHRMaWJGaWxlTmFtZShjb21waWxlck9wdGlvbnMpLCAvLyAnL2xpYi5kLnRzJyxcbiAgICAgIC8vIGdldERlZmF1bHRMaWJMb2NhdGlvbjogKCkgPT4gJy8nLFxuICAgICAgZ2V0RGlyZWN0b3JpZXM6ICgpID0+IFtdLFxuICAgICAgZ2V0TmV3TGluZTogKCkgPT4gc3lzLm5ld0xpbmUsXG4gICAgICBnZXRTb3VyY2VGaWxlOiBmaWxlTmFtZSA9PiB7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgc291cmNlRmlsZXMuZ2V0KGZpbGVOYW1lKSB8fFxuICAgICAgICAgIHNhdmUoXG4gICAgICAgICAgICB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgc3lzLnJlYWRGaWxlKGZpbGVOYW1lKSEsXG4gICAgICAgICAgICAgIGNvbXBpbGVyT3B0aW9ucy50YXJnZXQgfHwgZGVmYXVsdENvbXBpbGVyT3B0aW9ucyh0cykudGFyZ2V0ISxcbiAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgIClcbiAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgIH0sXG4gICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiAoKSA9PiBzeXMudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyxcbiAgICB9LFxuICAgIHVwZGF0ZUZpbGU6IHNvdXJjZUZpbGUgPT4ge1xuICAgICAgY29uc3QgYWxyZWFkeUV4aXN0cyA9IHNvdXJjZUZpbGVzLmhhcyhzb3VyY2VGaWxlLmZpbGVOYW1lKVxuICAgICAgc3lzLndyaXRlRmlsZShzb3VyY2VGaWxlLmZpbGVOYW1lLCBzb3VyY2VGaWxlLnRleHQpXG4gICAgICBzb3VyY2VGaWxlcy5zZXQoc291cmNlRmlsZS5maWxlTmFtZSwgc291cmNlRmlsZSlcbiAgICAgIHJldHVybiBhbHJlYWR5RXhpc3RzXG4gICAgfSxcbiAgfVxuICByZXR1cm4gdkhvc3Rcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGFuIG9iamVjdCB3aGljaCBjYW4gaG9zdCBhIGxhbmd1YWdlIHNlcnZpY2UgYWdhaW5zdCB0aGUgdmlydHVhbCBmaWxlLXN5c3RlbVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVmlydHVhbExhbmd1YWdlU2VydmljZUhvc3QoXG4gIHN5czogU3lzdGVtLFxuICByb290RmlsZXM6IHN0cmluZ1tdLFxuICBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgdHM6IFRTLFxuICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBDdXN0b21UcmFuc2Zvcm1lcnNcbikge1xuICBjb25zdCBmaWxlTmFtZXMgPSBbLi4ucm9vdEZpbGVzXVxuICBjb25zdCB7IGNvbXBpbGVySG9zdCwgdXBkYXRlRmlsZSB9ID0gY3JlYXRlVmlydHVhbENvbXBpbGVySG9zdChzeXMsIGNvbXBpbGVyT3B0aW9ucywgdHMpXG4gIGNvbnN0IGZpbGVWZXJzaW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcbiAgbGV0IHByb2plY3RWZXJzaW9uID0gMFxuICBjb25zdCBsYW5ndWFnZVNlcnZpY2VIb3N0OiBMYW5ndWFnZVNlcnZpY2VIb3N0ID0ge1xuICAgIC4uLmNvbXBpbGVySG9zdCxcbiAgICBnZXRQcm9qZWN0VmVyc2lvbjogKCkgPT4gcHJvamVjdFZlcnNpb24udG9TdHJpbmcoKSxcbiAgICBnZXRDb21waWxhdGlvblNldHRpbmdzOiAoKSA9PiBjb21waWxlck9wdGlvbnMsXG4gICAgZ2V0Q3VzdG9tVHJhbnNmb3JtZXJzOiAoKSA9PiBjdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgZ2V0U2NyaXB0RmlsZU5hbWVzOiAoKSA9PiBmaWxlTmFtZXMsXG4gICAgZ2V0U2NyaXB0U25hcHNob3Q6IGZpbGVOYW1lID0+IHtcbiAgICAgIGNvbnN0IGNvbnRlbnRzID0gc3lzLnJlYWRGaWxlKGZpbGVOYW1lKVxuICAgICAgaWYgKGNvbnRlbnRzKSB7XG4gICAgICAgIHJldHVybiB0cy5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKGNvbnRlbnRzKVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfSxcbiAgICBnZXRTY3JpcHRWZXJzaW9uOiBmaWxlTmFtZSA9PiB7XG4gICAgICByZXR1cm4gZmlsZVZlcnNpb25zLmdldChmaWxlTmFtZSkgfHwgXCIwXCJcbiAgICB9LFxuICAgIHdyaXRlRmlsZTogc3lzLndyaXRlRmlsZSxcbiAgfVxuXG4gIHR5cGUgUmV0dXJuID0ge1xuICAgIGxhbmd1YWdlU2VydmljZUhvc3Q6IExhbmd1YWdlU2VydmljZUhvc3RcbiAgICB1cGRhdGVGaWxlOiAoc291cmNlRmlsZTogaW1wb3J0KFwidHlwZXNjcmlwdFwiKS5Tb3VyY2VGaWxlKSA9PiB2b2lkXG4gIH1cblxuICBjb25zdCBsc0hvc3Q6IFJldHVybiA9IHtcbiAgICBsYW5ndWFnZVNlcnZpY2VIb3N0LFxuICAgIHVwZGF0ZUZpbGU6IHNvdXJjZUZpbGUgPT4ge1xuICAgICAgcHJvamVjdFZlcnNpb24rK1xuICAgICAgZmlsZVZlcnNpb25zLnNldChzb3VyY2VGaWxlLmZpbGVOYW1lLCBwcm9qZWN0VmVyc2lvbi50b1N0cmluZygpKVxuICAgICAgaWYgKCFmaWxlTmFtZXMuaW5jbHVkZXMoc291cmNlRmlsZS5maWxlTmFtZSkpIHtcbiAgICAgICAgZmlsZU5hbWVzLnB1c2goc291cmNlRmlsZS5maWxlTmFtZSlcbiAgICAgIH1cbiAgICAgIHVwZGF0ZUZpbGUoc291cmNlRmlsZSlcbiAgICB9LFxuICB9XG4gIHJldHVybiBsc0hvc3Rcbn1cblxuY29uc3QgcmVxdWlyZVBhdGggPSAoKSA9PiB7XG4gIHJldHVybiByZXF1aXJlKFN0cmluZy5mcm9tQ2hhckNvZGUoMTEyLCA5NywgMTE2LCAxMDQpKSBhcyB0eXBlb2YgaW1wb3J0KFwicGF0aFwiKVxufVxuXG5jb25zdCByZXF1aXJlRlMgPSAoKSA9PiB7XG4gIHJldHVybiByZXF1aXJlKFN0cmluZy5mcm9tQ2hhckNvZGUoMTAyLCAxMTUpKSBhcyB0eXBlb2YgaW1wb3J0KFwiZnNcIilcbn1cbiJdfQ==