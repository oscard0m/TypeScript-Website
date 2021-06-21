var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createExporter = void 0;
    const createExporter = (sandbox, monaco, ui) => {
        function getScriptTargetText(option) {
            return monaco.languages.typescript.ScriptTarget[option];
        }
        function getJsxEmitText(option) {
            if (option === monaco.languages.typescript.JsxEmit.None) {
                return undefined;
            }
            return monaco.languages.typescript.JsxEmit[option].toLowerCase();
        }
        function getModuleKindText(option) {
            if (option === monaco.languages.typescript.ModuleKind.None) {
                return undefined;
            }
            return monaco.languages.typescript.ModuleKind[option];
        }
        function getModuleResolutionText(option) {
            return option === monaco.languages.typescript.ModuleResolutionKind.Classic ? "classic" : "node";
        }
        // These are the compiler's defaults, and we want a diff from
        // these before putting it in the issue
        const defaultCompilerOptionsForTSC = {
            esModuleInterop: false,
            strictNullChecks: false,
            strict: false,
            strictFunctionTypes: false,
            strictPropertyInitialization: false,
            strictBindCallApply: false,
            noImplicitAny: false,
            noImplicitThis: false,
            noImplicitReturns: false,
            checkJs: false,
            allowJs: false,
            experimentalDecorators: false,
            emitDecoratorMetadata: false,
        };
        function getValidCompilerOptions(options) {
            const { target: targetOption, jsx: jsxOption, module: moduleOption, moduleResolution: moduleResolutionOption } = options, restOptions = __rest(options, ["target", "jsx", "module", "moduleResolution"]);
            const targetText = getScriptTargetText(targetOption);
            const jsxText = getJsxEmitText(jsxOption);
            const moduleKindText = getModuleKindText(moduleOption);
            const moduleResolutionText = getModuleResolutionText(moduleResolutionOption);
            const opts = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, restOptions), (targetText && { target: targetText })), (jsxText && { jsx: jsxText })), (moduleKindText && { module: moduleKindText })), { moduleResolution: moduleResolutionText });
            const diffFromTSCDefaults = Object.entries(opts).reduce((acc, [key, value]) => {
                if (opts[key] && value != defaultCompilerOptionsForTSC[key]) {
                    // @ts-ignore
                    acc[key] = opts[key];
                }
                return acc;
            }, {});
            return diffFromTSCDefaults;
        }
        // Based on https://github.com/stackblitz/core/blob/master/sdk/src/generate.ts
        function createHiddenInput(name, value) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = value;
            return input;
        }
        function createProjectForm(project) {
            const form = document.createElement("form");
            form.method = "POST";
            form.setAttribute("style", "display:none;");
            form.appendChild(createHiddenInput("project[title]", project.title));
            form.appendChild(createHiddenInput("project[description]", project.description));
            form.appendChild(createHiddenInput("project[template]", project.template));
            if (project.tags) {
                project.tags.forEach((tag) => {
                    form.appendChild(createHiddenInput("project[tags][]", tag));
                });
            }
            if (project.dependencies) {
                form.appendChild(createHiddenInput("project[dependencies]", JSON.stringify(project.dependencies)));
            }
            if (project.settings) {
                form.appendChild(createHiddenInput("project[settings]", JSON.stringify(project.settings)));
            }
            Object.keys(project.files).forEach(path => {
                form.appendChild(createHiddenInput(`project[files][${path}]`, project.files[path]));
            });
            return form;
        }
        const typescriptVersion = sandbox.ts.version;
        // prettier-ignore
        const stringifiedCompilerOptions = JSON.stringify({ compilerOptions: getValidCompilerOptions(sandbox.getCompilerOptions()) }, null, '  ');
        // TODO: pull deps
        function openProjectInStackBlitz() {
            const project = {
                title: "Playground Export - ",
                description: "123",
                template: "typescript",
                files: {
                    "index.ts": sandbox.getText(),
                    "tsconfig.json": stringifiedCompilerOptions,
                },
                dependencies: {
                    typescript: typescriptVersion,
                },
            };
            const form = createProjectForm(project);
            form.action = "https://stackblitz.com/run?view=editor";
            // https://github.com/stackblitz/core/blob/master/sdk/src/helpers.ts#L9
            // + buildProjectQuery(options);
            form.target = "_blank";
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }
        function openInBugWorkbench() {
            const hash = `#code/${sandbox.lzstring.compressToEncodedURIComponent(sandbox.getText())}`;
            document.location.assign(`/dev/bug-workbench/${hash}`);
        }
        function openInTSAST() {
            const hash = `#code/${sandbox.lzstring.compressToEncodedURIComponent(sandbox.getText())}`;
            document.location.assign(`https://ts-ast-viewer.com/${hash}`);
        }
        function openProjectInCodeSandbox() {
            const files = {
                "package.json": {
                    content: {
                        name: "TypeScript Playground Export",
                        version: "0.0.0",
                        description: "TypeScript playground exported Sandbox",
                        dependencies: {
                            typescript: typescriptVersion,
                        },
                    },
                },
                "index.ts": {
                    content: sandbox.getText(),
                },
                "tsconfig.json": {
                    content: stringifiedCompilerOptions,
                },
            };
            // Using the v1 get API
            const parameters = sandbox.lzstring
                .compressToBase64(JSON.stringify({ files }))
                .replace(/\+/g, "-") // Convert '+' to '-'
                .replace(/\//g, "_") // Convert '/' to '_'
                .replace(/=+$/, ""); // Remove ending '='
            const url = `https://codesandbox.io/api/v1/sandboxes/define?view=editor&parameters=${parameters}`;
            document.location.assign(url);
            // Alternative using the http URL API, which uses POST. This has the trade-off where
            // the async nature of the call means that the redirect at the end triggers
            // popup security mechanisms in browsers because the function isn't blessed as
            // being a direct result of a user action.
            // fetch("https://codesandbox.io/api/v1/sandboxes/define?json=1", {
            //   method: "POST",
            //   body: JSON.stringify({ files }),
            //   headers: {
            //     Accept: "application/json",
            //     "Content-Type": "application/json"
            //   }
            // })
            // .then(x => x.json())
            // .then(data => {
            //   window.open('https://codesandbox.io/s/' + data.sandbox_id, '_blank');
            // });
        }
        function codify(code, ext) {
            return "```" + ext + "\n" + code + "\n```\n";
        }
        function makeMarkdown() {
            return __awaiter(this, void 0, void 0, function* () {
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                const jsSection = sandbox.config.useJavaScript
                    ? ""
                    : `
<details><summary><b>Output</b></summary>

${codify(yield sandbox.getRunnableJS(), "ts")}

</details>
`;
                return `
${codify(sandbox.getText(), "ts")}

${jsSection}

<details><summary><b>Compiler Options</b></summary>

${codify(stringifiedCompilerOptions, "json")}

</details>

**Playground Link:** [Provided](${fullURL})
      `;
            });
        }
        function copyAsMarkdownIssue(e) {
            return __awaiter(this, void 0, void 0, function* () {
                e.persist();
                const markdown = yield makeMarkdown();
                ui.showModal(markdown, document.getElementById("exports-dropdown"), "Markdown Version of Playground Code for GitHub Issue", undefined, e);
                return false;
            });
        }
        function copyForChat(e) {
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            const chat = `[Playground Link](${fullURL})`;
            ui.showModal(chat, document.getElementById("exports-dropdown"), "Markdown for chat", undefined, e);
            return false;
        }
        function copyForChatWithPreview(e) {
            e.persist();
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            const ts = sandbox.getText();
            const preview = ts.length > 200 ? ts.substring(0, 200) + "..." : ts.substring(0, 200);
            const code = "```\n" + preview + "\n```\n";
            const chat = `${code}\n[Playground Link](${fullURL})`;
            ui.showModal(chat, document.getElementById("exports-dropdown"), "Markdown code", undefined, e);
            return false;
        }
        function exportAsTweet() {
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            document.location.assign(`http://www.twitter.com/share?url=${fullURL}`);
        }
        return {
            openProjectInStackBlitz,
            openProjectInCodeSandbox,
            copyAsMarkdownIssue,
            copyForChat,
            copyForChatWithPreview,
            openInTSAST,
            openInBugWorkbench,
            exportAsTweet,
        };
    };
    exports.createExporter = createExporter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9leHBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFLTyxNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQWdCLEVBQUUsTUFBc0MsRUFBRSxFQUFNLEVBQUUsRUFBRTtRQUNqRyxTQUFTLG1CQUFtQixDQUFDLE1BQVc7WUFDdEMsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVELFNBQVMsY0FBYyxDQUFDLE1BQVc7WUFDakMsSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtnQkFDdkQsT0FBTyxTQUFTLENBQUE7YUFDakI7WUFDRCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsRSxDQUFDO1FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxNQUFXO1lBQ3BDLElBQUksTUFBTSxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Z0JBQzFELE9BQU8sU0FBUyxDQUFBO2FBQ2pCO1lBQ0QsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELFNBQVMsdUJBQXVCLENBQUMsTUFBVztZQUMxQyxPQUFPLE1BQU0sS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQ2pHLENBQUM7UUFFRCw2REFBNkQ7UUFD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QyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUVyRixNQUFNLElBQUksR0FBRyxPQUFPLEdBQUcsT0FBTyxHQUFHLFNBQVMsQ0FBQTtZQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLElBQUksdUJBQXVCLE9BQU8sR0FBRyxDQUFBO1lBQ3JELEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUUsRUFBRSxlQUFlLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9GLE9BQU8sS0FBSyxDQUFBO1FBQ2QsQ0FBQztRQUVELFNBQVMsYUFBYTtZQUNwQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsaUNBQWlDLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDaEUsTUFBTSxPQUFPLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxLQUFLLEVBQUUsQ0FBQTtZQUUvRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxvQ0FBb0MsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUN6RSxDQUFDO1FBRUQsT0FBTztZQUNMLHVCQUF1QjtZQUN2Qix3QkFBd0I7WUFDeEIsbUJBQW1CO1lBQ25CLFdBQVc7WUFDWCxzQkFBc0I7WUFDdEIsV0FBVztZQUNYLGtCQUFrQjtZQUNsQixhQUFhO1NBQ2QsQ0FBQTtJQUNILENBQUMsQ0FBQTtJQWhTWSxRQUFBLGNBQWMsa0JBZ1MxQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFVJIH0gZnJvbSBcIi4vY3JlYXRlVUlcIlxuXG50eXBlIFNhbmRib3ggPSBpbXBvcnQoXCJAdHlwZXNjcmlwdC9zYW5kYm94XCIpLlNhbmRib3hcbnR5cGUgQ29tcGlsZXJPcHRpb25zID0gaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5sYW5ndWFnZXMudHlwZXNjcmlwdC5Db21waWxlck9wdGlvbnNcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUV4cG9ydGVyID0gKHNhbmRib3g6IFNhbmRib3gsIG1vbmFjbzogdHlwZW9mIGltcG9ydChcIm1vbmFjby1lZGl0b3JcIiksIHVpOiBVSSkgPT4ge1xuICBmdW5jdGlvbiBnZXRTY3JpcHRUYXJnZXRUZXh0KG9wdGlvbjogYW55KSB7XG4gICAgcmV0dXJuIG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5TY3JpcHRUYXJnZXRbb3B0aW9uXVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SnN4RW1pdFRleHQob3B0aW9uOiBhbnkpIHtcbiAgICBpZiAob3B0aW9uID09PSBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdC5Ob25lKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxuICAgIHJldHVybiBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdFtvcHRpb25dLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE1vZHVsZUtpbmRUZXh0KG9wdGlvbjogYW55KSB7XG4gICAgaWYgKG9wdGlvbiA9PT0gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0Lk1vZHVsZUtpbmQuTm9uZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICByZXR1cm4gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0Lk1vZHVsZUtpbmRbb3B0aW9uXVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TW9kdWxlUmVzb2x1dGlvblRleHQob3B0aW9uOiBhbnkpIHtcbiAgICByZXR1cm4gb3B0aW9uID09PSBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuTW9kdWxlUmVzb2x1dGlvbktpbmQuQ2xhc3NpYyA/IFwiY2xhc3NpY1wiIDogXCJub2RlXCJcbiAgfVxuXG4gIC8vIFRoZXNlIGFyZSB0aGUgY29tcGlsZXIncyBkZWZhdWx0cywgYW5kIHdlIHdhbnQgYSBkaWZmIGZyb21cbiAgLy8gdGhlc2UgYmVmb3JlIHB1dHRpbmcgaXQgaW4gdGhlIGlzc3VlXG4gIGNvbnN0IGRlZmF1bHRDb21waWxlck9wdGlvbnNGb3JUU0M6IENvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICBlc01vZHVsZUludGVyb3A6IGZhbHNlLFxuICAgIHN0cmljdE51bGxDaGVja3M6IGZhbHNlLFxuICAgIHN0cmljdDogZmFsc2UsXG4gICAgc3RyaWN0RnVuY3Rpb25UeXBlczogZmFsc2UsXG4gICAgc3RyaWN0UHJvcGVydHlJbml0aWFsaXphdGlvbjogZmFsc2UsXG4gICAgc3RyaWN0QmluZENhbGxBcHBseTogZmFsc2UsXG4gICAgbm9JbXBsaWNpdEFueTogZmFsc2UsXG4gICAgbm9JbXBsaWNpdFRoaXM6IGZhbHNlLFxuICAgIG5vSW1wbGljaXRSZXR1cm5zOiBmYWxzZSxcbiAgICBjaGVja0pzOiBmYWxzZSxcbiAgICBhbGxvd0pzOiBmYWxzZSxcbiAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiBmYWxzZSxcbiAgICBlbWl0RGVjb3JhdG9yTWV0YWRhdGE6IGZhbHNlLFxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VmFsaWRDb21waWxlck9wdGlvbnMob3B0aW9uczogQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgY29uc3Qge1xuICAgICAgdGFyZ2V0OiB0YXJnZXRPcHRpb24sXG4gICAgICBqc3g6IGpzeE9wdGlvbixcbiAgICAgIG1vZHVsZTogbW9kdWxlT3B0aW9uLFxuICAgICAgbW9kdWxlUmVzb2x1dGlvbjogbW9kdWxlUmVzb2x1dGlvbk9wdGlvbixcbiAgICAgIC4uLnJlc3RPcHRpb25zXG4gICAgfSA9IG9wdGlvbnNcblxuICAgIGNvbnN0IHRhcmdldFRleHQgPSBnZXRTY3JpcHRUYXJnZXRUZXh0KHRhcmdldE9wdGlvbilcbiAgICBjb25zdCBqc3hUZXh0ID0gZ2V0SnN4RW1pdFRleHQoanN4T3B0aW9uKVxuICAgIGNvbnN0IG1vZHVsZUtpbmRUZXh0ID0gZ2V0TW9kdWxlS2luZFRleHQobW9kdWxlT3B0aW9uKVxuICAgIGNvbnN0IG1vZHVsZVJlc29sdXRpb25UZXh0ID0gZ2V0TW9kdWxlUmVzb2x1dGlvblRleHQobW9kdWxlUmVzb2x1dGlvbk9wdGlvbilcblxuICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAuLi5yZXN0T3B0aW9ucyxcbiAgICAgIC4uLih0YXJnZXRUZXh0ICYmIHsgdGFyZ2V0OiB0YXJnZXRUZXh0IH0pLFxuICAgICAgLi4uKGpzeFRleHQgJiYgeyBqc3g6IGpzeFRleHQgfSksXG4gICAgICAuLi4obW9kdWxlS2luZFRleHQgJiYgeyBtb2R1bGU6IG1vZHVsZUtpbmRUZXh0IH0pLFxuICAgICAgbW9kdWxlUmVzb2x1dGlvbjogbW9kdWxlUmVzb2x1dGlvblRleHQsXG4gICAgfVxuXG4gICAgY29uc3QgZGlmZkZyb21UU0NEZWZhdWx0cyA9IE9iamVjdC5lbnRyaWVzKG9wdHMpLnJlZHVjZSgoYWNjLCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGlmICgob3B0cyBhcyBhbnkpW2tleV0gJiYgdmFsdWUgIT0gZGVmYXVsdENvbXBpbGVyT3B0aW9uc0ZvclRTQ1trZXldKSB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgYWNjW2tleV0gPSBvcHRzW2tleV1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjY1xuICAgIH0sIHt9KVxuXG4gICAgcmV0dXJuIGRpZmZGcm9tVFNDRGVmYXVsdHNcbiAgfVxuXG4gIC8vIEJhc2VkIG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9zdGFja2JsaXR6L2NvcmUvYmxvYi9tYXN0ZXIvc2RrL3NyYy9nZW5lcmF0ZS50c1xuICBmdW5jdGlvbiBjcmVhdGVIaWRkZW5JbnB1dChuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKVxuICAgIGlucHV0LnR5cGUgPSBcImhpZGRlblwiXG4gICAgaW5wdXQubmFtZSA9IG5hbWVcbiAgICBpbnB1dC52YWx1ZSA9IHZhbHVlXG4gICAgcmV0dXJuIGlucHV0XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVQcm9qZWN0Rm9ybShwcm9qZWN0OiBhbnkpIHtcbiAgICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIilcblxuICAgIGZvcm0ubWV0aG9kID0gXCJQT1NUXCJcbiAgICBmb3JtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpub25lO1wiKVxuXG4gICAgZm9ybS5hcHBlbmRDaGlsZChjcmVhdGVIaWRkZW5JbnB1dChcInByb2plY3RbdGl0bGVdXCIsIHByb2plY3QudGl0bGUpKVxuICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W2Rlc2NyaXB0aW9uXVwiLCBwcm9qZWN0LmRlc2NyaXB0aW9uKSlcbiAgICBmb3JtLmFwcGVuZENoaWxkKGNyZWF0ZUhpZGRlbklucHV0KFwicHJvamVjdFt0ZW1wbGF0ZV1cIiwgcHJvamVjdC50ZW1wbGF0ZSkpXG5cbiAgICBpZiAocHJvamVjdC50YWdzKSB7XG4gICAgICBwcm9qZWN0LnRhZ3MuZm9yRWFjaCgodGFnOiBzdHJpbmcpID0+IHtcbiAgICAgICAgZm9ybS5hcHBlbmRDaGlsZChjcmVhdGVIaWRkZW5JbnB1dChcInByb2plY3RbdGFnc11bXVwiLCB0YWcpKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAocHJvamVjdC5kZXBlbmRlbmNpZXMpIHtcbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W2RlcGVuZGVuY2llc11cIiwgSlNPTi5zdHJpbmdpZnkocHJvamVjdC5kZXBlbmRlbmNpZXMpKSlcbiAgICB9XG5cbiAgICBpZiAocHJvamVjdC5zZXR0aW5ncykge1xuICAgICAgZm9ybS5hcHBlbmRDaGlsZChjcmVhdGVIaWRkZW5JbnB1dChcInByb2plY3Rbc2V0dGluZ3NdXCIsIEpTT04uc3RyaW5naWZ5KHByb2plY3Quc2V0dGluZ3MpKSlcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhwcm9qZWN0LmZpbGVzKS5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgZm9ybS5hcHBlbmRDaGlsZChjcmVhdGVIaWRkZW5JbnB1dChgcHJvamVjdFtmaWxlc11bJHtwYXRofV1gLCBwcm9qZWN0LmZpbGVzW3BhdGhdKSlcbiAgICB9KVxuXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGNvbnN0IHR5cGVzY3JpcHRWZXJzaW9uID0gc2FuZGJveC50cy52ZXJzaW9uXG4gIC8vIHByZXR0aWVyLWlnbm9yZVxuICBjb25zdCBzdHJpbmdpZmllZENvbXBpbGVyT3B0aW9ucyA9IEpTT04uc3RyaW5naWZ5KHsgY29tcGlsZXJPcHRpb25zOiBnZXRWYWxpZENvbXBpbGVyT3B0aW9ucyhzYW5kYm94LmdldENvbXBpbGVyT3B0aW9ucygpKSB9LCBudWxsLCAnICAnKVxuXG4gIC8vIFRPRE86IHB1bGwgZGVwc1xuICBmdW5jdGlvbiBvcGVuUHJvamVjdEluU3RhY2tCbGl0eigpIHtcbiAgICBjb25zdCBwcm9qZWN0ID0ge1xuICAgICAgdGl0bGU6IFwiUGxheWdyb3VuZCBFeHBvcnQgLSBcIixcbiAgICAgIGRlc2NyaXB0aW9uOiBcIjEyM1wiLFxuICAgICAgdGVtcGxhdGU6IFwidHlwZXNjcmlwdFwiLFxuICAgICAgZmlsZXM6IHtcbiAgICAgICAgXCJpbmRleC50c1wiOiBzYW5kYm94LmdldFRleHQoKSxcbiAgICAgICAgXCJ0c2NvbmZpZy5qc29uXCI6IHN0cmluZ2lmaWVkQ29tcGlsZXJPcHRpb25zLFxuICAgICAgfSxcbiAgICAgIGRlcGVuZGVuY2llczoge1xuICAgICAgICB0eXBlc2NyaXB0OiB0eXBlc2NyaXB0VmVyc2lvbixcbiAgICAgIH0sXG4gICAgfVxuICAgIGNvbnN0IGZvcm0gPSBjcmVhdGVQcm9qZWN0Rm9ybShwcm9qZWN0KVxuICAgIGZvcm0uYWN0aW9uID0gXCJodHRwczovL3N0YWNrYmxpdHouY29tL3J1bj92aWV3PWVkaXRvclwiXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3N0YWNrYmxpdHovY29yZS9ibG9iL21hc3Rlci9zZGsvc3JjL2hlbHBlcnMudHMjTDlcbiAgICAvLyArIGJ1aWxkUHJvamVjdFF1ZXJ5KG9wdGlvbnMpO1xuICAgIGZvcm0udGFyZ2V0ID0gXCJfYmxhbmtcIlxuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmb3JtKVxuICAgIGZvcm0uc3VibWl0KClcbiAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGZvcm0pXG4gIH1cblxuICBmdW5jdGlvbiBvcGVuSW5CdWdXb3JrYmVuY2goKSB7XG4gICAgY29uc3QgaGFzaCA9IGAjY29kZS8ke3NhbmRib3gubHpzdHJpbmcuY29tcHJlc3NUb0VuY29kZWRVUklDb21wb25lbnQoc2FuZGJveC5nZXRUZXh0KCkpfWBcbiAgICBkb2N1bWVudC5sb2NhdGlvbi5hc3NpZ24oYC9kZXYvYnVnLXdvcmtiZW5jaC8ke2hhc2h9YClcbiAgfVxuXG4gIGZ1bmN0aW9uIG9wZW5JblRTQVNUKCkge1xuICAgIGNvbnN0IGhhc2ggPSBgI2NvZGUvJHtzYW5kYm94Lmx6c3RyaW5nLmNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50KHNhbmRib3guZ2V0VGV4dCgpKX1gXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKGBodHRwczovL3RzLWFzdC12aWV3ZXIuY29tLyR7aGFzaH1gKVxuICB9XG5cbiAgZnVuY3Rpb24gb3BlblByb2plY3RJbkNvZGVTYW5kYm94KCkge1xuICAgIGNvbnN0IGZpbGVzID0ge1xuICAgICAgXCJwYWNrYWdlLmpzb25cIjoge1xuICAgICAgICBjb250ZW50OiB7XG4gICAgICAgICAgbmFtZTogXCJUeXBlU2NyaXB0IFBsYXlncm91bmQgRXhwb3J0XCIsXG4gICAgICAgICAgdmVyc2lvbjogXCIwLjAuMFwiLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlR5cGVTY3JpcHQgcGxheWdyb3VuZCBleHBvcnRlZCBTYW5kYm94XCIsXG4gICAgICAgICAgZGVwZW5kZW5jaWVzOiB7XG4gICAgICAgICAgICB0eXBlc2NyaXB0OiB0eXBlc2NyaXB0VmVyc2lvbixcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIFwiaW5kZXgudHNcIjoge1xuICAgICAgICBjb250ZW50OiBzYW5kYm94LmdldFRleHQoKSxcbiAgICAgIH0sXG4gICAgICBcInRzY29uZmlnLmpzb25cIjoge1xuICAgICAgICBjb250ZW50OiBzdHJpbmdpZmllZENvbXBpbGVyT3B0aW9ucyxcbiAgICAgIH0sXG4gICAgfVxuXG4gICAgLy8gVXNpbmcgdGhlIHYxIGdldCBBUElcbiAgICBjb25zdCBwYXJhbWV0ZXJzID0gc2FuZGJveC5senN0cmluZ1xuICAgICAgLmNvbXByZXNzVG9CYXNlNjQoSlNPTi5zdHJpbmdpZnkoeyBmaWxlcyB9KSlcbiAgICAgIC5yZXBsYWNlKC9cXCsvZywgXCItXCIpIC8vIENvbnZlcnQgJysnIHRvICctJ1xuICAgICAgLnJlcGxhY2UoL1xcLy9nLCBcIl9cIikgLy8gQ29udmVydCAnLycgdG8gJ18nXG4gICAgICAucmVwbGFjZSgvPSskLywgXCJcIikgLy8gUmVtb3ZlIGVuZGluZyAnPSdcblxuICAgIGNvbnN0IHVybCA9IGBodHRwczovL2NvZGVzYW5kYm94LmlvL2FwaS92MS9zYW5kYm94ZXMvZGVmaW5lP3ZpZXc9ZWRpdG9yJnBhcmFtZXRlcnM9JHtwYXJhbWV0ZXJzfWBcbiAgICBkb2N1bWVudC5sb2NhdGlvbi5hc3NpZ24odXJsKVxuXG4gICAgLy8gQWx0ZXJuYXRpdmUgdXNpbmcgdGhlIGh0dHAgVVJMIEFQSSwgd2hpY2ggdXNlcyBQT1NULiBUaGlzIGhhcyB0aGUgdHJhZGUtb2ZmIHdoZXJlXG4gICAgLy8gdGhlIGFzeW5jIG5hdHVyZSBvZiB0aGUgY2FsbCBtZWFucyB0aGF0IHRoZSByZWRpcmVjdCBhdCB0aGUgZW5kIHRyaWdnZXJzXG4gICAgLy8gcG9wdXAgc2VjdXJpdHkgbWVjaGFuaXNtcyBpbiBicm93c2VycyBiZWNhdXNlIHRoZSBmdW5jdGlvbiBpc24ndCBibGVzc2VkIGFzXG4gICAgLy8gYmVpbmcgYSBkaXJlY3QgcmVzdWx0IG9mIGEgdXNlciBhY3Rpb24uXG5cbiAgICAvLyBmZXRjaChcImh0dHBzOi8vY29kZXNhbmRib3guaW8vYXBpL3YxL3NhbmRib3hlcy9kZWZpbmU/anNvbj0xXCIsIHtcbiAgICAvLyAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgLy8gICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGZpbGVzIH0pLFxuICAgIC8vICAgaGVhZGVyczoge1xuICAgIC8vICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgIC8vICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgIC8vICAgfVxuICAgIC8vIH0pXG4gICAgLy8gLnRoZW4oeCA9PiB4Lmpzb24oKSlcbiAgICAvLyAudGhlbihkYXRhID0+IHtcbiAgICAvLyAgIHdpbmRvdy5vcGVuKCdodHRwczovL2NvZGVzYW5kYm94LmlvL3MvJyArIGRhdGEuc2FuZGJveF9pZCwgJ19ibGFuaycpO1xuICAgIC8vIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY29kaWZ5KGNvZGU6IHN0cmluZywgZXh0OiBzdHJpbmcpIHtcbiAgICByZXR1cm4gXCJgYGBcIiArIGV4dCArIFwiXFxuXCIgKyBjb2RlICsgXCJcXG5gYGBcXG5cIlxuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gbWFrZU1hcmtkb3duKCkge1xuICAgIGNvbnN0IHF1ZXJ5ID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICBjb25zdCBmdWxsVVJMID0gYCR7ZG9jdW1lbnQubG9jYXRpb24ucHJvdG9jb2x9Ly8ke2RvY3VtZW50LmxvY2F0aW9uLmhvc3R9JHtkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZX0ke3F1ZXJ5fWBcbiAgICBjb25zdCBqc1NlY3Rpb24gPSBzYW5kYm94LmNvbmZpZy51c2VKYXZhU2NyaXB0XG4gICAgICA/IFwiXCJcbiAgICAgIDogYFxuPGRldGFpbHM+PHN1bW1hcnk+PGI+T3V0cHV0PC9iPjwvc3VtbWFyeT5cblxuJHtjb2RpZnkoYXdhaXQgc2FuZGJveC5nZXRSdW5uYWJsZUpTKCksIFwidHNcIil9XG5cbjwvZGV0YWlscz5cbmBcblxuICAgIHJldHVybiBgXG4ke2NvZGlmeShzYW5kYm94LmdldFRleHQoKSwgXCJ0c1wiKX1cblxuJHtqc1NlY3Rpb259XG5cbjxkZXRhaWxzPjxzdW1tYXJ5PjxiPkNvbXBpbGVyIE9wdGlvbnM8L2I+PC9zdW1tYXJ5PlxuXG4ke2NvZGlmeShzdHJpbmdpZmllZENvbXBpbGVyT3B0aW9ucywgXCJqc29uXCIpfVxuXG48L2RldGFpbHM+XG5cbioqUGxheWdyb3VuZCBMaW5rOioqIFtQcm92aWRlZF0oJHtmdWxsVVJMfSlcbiAgICAgIGBcbiAgfVxuICBhc3luYyBmdW5jdGlvbiBjb3B5QXNNYXJrZG93bklzc3VlKGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHtcbiAgICBlLnBlcnNpc3QoKVxuXG4gICAgY29uc3QgbWFya2Rvd24gPSBhd2FpdCBtYWtlTWFya2Rvd24oKVxuICAgIHVpLnNob3dNb2RhbChcbiAgICAgIG1hcmtkb3duLFxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRzLWRyb3Bkb3duXCIpISxcbiAgICAgIFwiTWFya2Rvd24gVmVyc2lvbiBvZiBQbGF5Z3JvdW5kIENvZGUgZm9yIEdpdEh1YiBJc3N1ZVwiLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgZVxuICAgIClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvcHlGb3JDaGF0KGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHtcbiAgICBjb25zdCBxdWVyeSA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgY29uc3QgZnVsbFVSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9JHtxdWVyeX1gXG4gICAgY29uc3QgY2hhdCA9IGBbUGxheWdyb3VuZCBMaW5rXSgke2Z1bGxVUkx9KWBcbiAgICB1aS5zaG93TW9kYWwoY2hhdCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRzLWRyb3Bkb3duXCIpISwgXCJNYXJrZG93biBmb3IgY2hhdFwiLCB1bmRlZmluZWQsIGUpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBmdW5jdGlvbiBjb3B5Rm9yQ2hhdFdpdGhQcmV2aWV3KGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHtcbiAgICBlLnBlcnNpc3QoKVxuXG4gICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuXG4gICAgY29uc3QgdHMgPSBzYW5kYm94LmdldFRleHQoKVxuICAgIGNvbnN0IHByZXZpZXcgPSB0cy5sZW5ndGggPiAyMDAgPyB0cy5zdWJzdHJpbmcoMCwgMjAwKSArIFwiLi4uXCIgOiB0cy5zdWJzdHJpbmcoMCwgMjAwKVxuXG4gICAgY29uc3QgY29kZSA9IFwiYGBgXFxuXCIgKyBwcmV2aWV3ICsgXCJcXG5gYGBcXG5cIlxuICAgIGNvbnN0IGNoYXQgPSBgJHtjb2RlfVxcbltQbGF5Z3JvdW5kIExpbmtdKCR7ZnVsbFVSTH0pYFxuICAgIHVpLnNob3dNb2RhbChjaGF0LCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImV4cG9ydHMtZHJvcGRvd25cIikhLCBcIk1hcmtkb3duIGNvZGVcIiwgdW5kZWZpbmVkLCBlKVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgZnVuY3Rpb24gZXhwb3J0QXNUd2VldCgpIHtcbiAgICBjb25zdCBxdWVyeSA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgY29uc3QgZnVsbFVSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9JHtxdWVyeX1gXG5cbiAgICBkb2N1bWVudC5sb2NhdGlvbi5hc3NpZ24oYGh0dHA6Ly93d3cudHdpdHRlci5jb20vc2hhcmU/dXJsPSR7ZnVsbFVSTH1gKVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBvcGVuUHJvamVjdEluU3RhY2tCbGl0eixcbiAgICBvcGVuUHJvamVjdEluQ29kZVNhbmRib3gsXG4gICAgY29weUFzTWFya2Rvd25Jc3N1ZSxcbiAgICBjb3B5Rm9yQ2hhdCxcbiAgICBjb3B5Rm9yQ2hhdFdpdGhQcmV2aWV3LFxuICAgIG9wZW5JblRTQVNULFxuICAgIG9wZW5JbkJ1Z1dvcmtiZW5jaCxcbiAgICBleHBvcnRBc1R3ZWV0LFxuICB9XG59XG4iXX0=