define(["require", "exports", "../createUI", "../localizeWithFallback"], function (require, exports, createUI_1, localizeWithFallback_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.runWithCustomLogs = exports.clearLogs = exports.runPlugin = void 0;
    let allLogs = [];
    let addedClearAction = false;
    const cancelButtonSVG = `
<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="6" cy="7" r="5" stroke-width="2"/>
<line x1="0.707107" y1="1.29289" x2="11.7071" y2="12.2929" stroke-width="2"/>
</svg>
`;
    const runPlugin = (i, utils) => {
        const plugin = {
            id: "logs",
            displayName: i("play_sidebar_logs"),
            willMount: (sandbox, container) => {
                const ui = (0, createUI_1.createUI)();
                const clearLogsAction = {
                    id: "clear-logs-play",
                    label: "Clear Playground Logs",
                    keybindings: [sandbox.monaco.KeyMod.CtrlCmd | sandbox.monaco.KeyCode.KEY_K],
                    contextMenuGroupId: "run",
                    contextMenuOrder: 1.5,
                    run: function () {
                        (0, exports.clearLogs)();
                        ui.flashInfo(i("play_clear_logs"));
                    },
                };
                if (!addedClearAction) {
                    sandbox.editor.addAction(clearLogsAction);
                    addedClearAction = true;
                }
                const errorUL = document.createElement("div");
                errorUL.id = "log-container";
                container.appendChild(errorUL);
                const logs = document.createElement("div");
                logs.id = "log";
                logs.innerHTML = allLogs.join("<hr />");
                errorUL.appendChild(logs);
                const logToolsContainer = document.createElement("div");
                logToolsContainer.id = "log-tools";
                container.appendChild(logToolsContainer);
                const clearLogsButton = document.createElement("div");
                clearLogsButton.id = "clear-logs-button";
                clearLogsButton.innerHTML = cancelButtonSVG;
                clearLogsButton.onclick = e => {
                    e.preventDefault();
                    clearLogsAction.run();
                    const filterTextBox = document.getElementById("filter-logs");
                    filterTextBox.value = "";
                };
                logToolsContainer.appendChild(clearLogsButton);
                const filterTextBox = document.createElement("input");
                filterTextBox.id = "filter-logs";
                filterTextBox.placeholder = i("play_sidebar_tools_filter_placeholder");
                filterTextBox.addEventListener("input", (e) => {
                    const inputText = e.target.value;
                    const eleLog = document.getElementById("log");
                    eleLog.innerHTML = allLogs
                        .filter(log => {
                        const userLoggedText = log.substring(log.indexOf(":") + 1, log.indexOf("&nbsp;<br>"));
                        return userLoggedText.includes(inputText);
                    })
                        .join("<hr />");
                    if (inputText === "") {
                        const logContainer = document.getElementById("log-container");
                        logContainer.scrollTop = logContainer.scrollHeight;
                    }
                });
                logToolsContainer.appendChild(filterTextBox);
                if (allLogs.length === 0) {
                    const noErrorsMessage = document.createElement("div");
                    noErrorsMessage.id = "empty-message-container";
                    container.appendChild(noErrorsMessage);
                    const message = document.createElement("div");
                    message.textContent = (0, localizeWithFallback_1.localize)("play_sidebar_logs_no_logs", "No logs");
                    message.classList.add("empty-plugin-message");
                    noErrorsMessage.appendChild(message);
                    errorUL.style.display = "none";
                    logToolsContainer.style.display = "none";
                }
            },
        };
        return plugin;
    };
    exports.runPlugin = runPlugin;
    const clearLogs = () => {
        allLogs = [];
        const logs = document.getElementById("log");
        if (logs) {
            logs.textContent = "";
        }
    };
    exports.clearLogs = clearLogs;
    const runWithCustomLogs = (closure, i) => {
        const noLogs = document.getElementById("empty-message-container");
        const logContainer = document.getElementById("log-container");
        const logToolsContainer = document.getElementById("log-tools");
        if (noLogs) {
            noLogs.style.display = "none";
            logContainer.style.display = "block";
            logToolsContainer.style.display = "flex";
        }
        rewireLoggingToElement(() => document.getElementById("log"), () => document.getElementById("log-container"), closure, true, i);
    };
    exports.runWithCustomLogs = runWithCustomLogs;
    // Thanks SO: https://stackoverflow.com/questions/20256760/javascript-console-log-to-html/35449256#35449256
    function rewireLoggingToElement(eleLocator, eleOverflowLocator, closure, autoScroll, i) {
        const rawConsole = console;
        closure.then(js => {
            const replace = {};
            bindLoggingFunc(replace, rawConsole, "log", "LOG");
            bindLoggingFunc(replace, rawConsole, "debug", "DBG");
            bindLoggingFunc(replace, rawConsole, "warn", "WRN");
            bindLoggingFunc(replace, rawConsole, "error", "ERR");
            replace["clear"] = exports.clearLogs;
            const console = Object.assign({}, rawConsole, replace);
            try {
                const safeJS = sanitizeJS(js);
                eval(safeJS);
            }
            catch (error) {
                console.error(i("play_run_js_fail"));
                console.error(error);
                if (error instanceof SyntaxError && /\bexport\b/u.test(error.message)) {
                    console.warn('Tip: Change the Module setting to "CommonJS" in TS Config settings to allow top-level exports to work in the Playground');
                }
            }
        });
        function bindLoggingFunc(obj, raw, name, id) {
            obj[name] = function (...objs) {
                const output = produceOutput(objs);
                const eleLog = eleLocator();
                const prefix = `[<span class="log-${name}">${id}</span>]: `;
                const eleContainerLog = eleOverflowLocator();
                allLogs.push(`${prefix}${output}<br>`);
                eleLog.innerHTML = allLogs.join("<hr />");
                if (autoScroll && eleContainerLog) {
                    eleContainerLog.scrollTop = eleContainerLog.scrollHeight;
                }
                raw[name](...objs);
            };
        }
        const objectToText = (arg) => {
            const isObj = typeof arg === "object";
            let textRep = "";
            if (arg && arg.stack && arg.message) {
                // special case for err
                textRep = arg.message;
            }
            else if (arg === null) {
                textRep = "<span class='literal'>null</span>";
            }
            else if (arg === undefined) {
                textRep = "<span class='literal'>undefined</span>";
            }
            else if (typeof arg === "symbol") {
                textRep = `<span class='literal'>${String(arg)}</span>`;
            }
            else if (Array.isArray(arg)) {
                textRep = "[" + arg.map(objectToText).join("<span class='comma'>, </span>") + "]";
            }
            else if (typeof arg === "string") {
                textRep = '"' + arg + '"';
            }
            else if (isObj) {
                const name = arg.constructor && arg.constructor.name;
                // No one needs to know an obj is an obj
                const nameWithoutObject = name && name === "Object" ? "" : name;
                const prefix = nameWithoutObject ? `${nameWithoutObject}: ` : "";
                // JSON.stringify omits any keys with a value of undefined. To get around this, we replace undefined with the text __undefined__ and then do a global replace using regex back to keyword undefined
                textRep = prefix + JSON.stringify(arg, (_, value) => value === undefined ? '__undefined__' : value, 2).replace(/"__undefined__"/g, 'undefined');
            }
            else {
                textRep = String(arg);
            }
            return textRep;
        };
        function produceOutput(args) {
            return args.reduce((output, arg, index) => {
                const textRep = objectToText(arg);
                const showComma = index !== args.length - 1;
                const comma = showComma ? "<span class='comma'>, </span>" : "";
                return output + textRep + comma + "&nbsp;";
            }, "");
        }
    }
    // The reflect-metadata runtime is available, so allow that to go through
    function sanitizeJS(code) {
        return code.replace(`import "reflect-metadata"`, "").replace(`require("reflect-metadata")`, "");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BsYXlncm91bmQvc3JjL3NpZGViYXIvcnVudGltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBS0EsSUFBSSxPQUFPLEdBQWEsRUFBRSxDQUFBO0lBQzFCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO0lBQzVCLE1BQU0sZUFBZSxHQUFHOzs7OztDQUt2QixDQUFBO0lBRU0sTUFBTSxTQUFTLEdBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ25ELE1BQU0sTUFBTSxHQUFxQjtZQUMvQixFQUFFLEVBQUUsTUFBTTtZQUNWLFdBQVcsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUM7WUFDbkMsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUNoQyxNQUFNLEVBQUUsR0FBRyxDQUFBLEdBQUEsbUJBQVEsQ0FBQSxFQUFFLENBQUE7Z0JBRXJCLE1BQU0sZUFBZSxHQUFHO29CQUN0QixFQUFFLEVBQUUsaUJBQWlCO29CQUNyQixLQUFLLEVBQUUsdUJBQXVCO29CQUM5QixXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO29CQUUzRSxrQkFBa0IsRUFBRSxLQUFLO29CQUN6QixnQkFBZ0IsRUFBRSxHQUFHO29CQUVyQixHQUFHLEVBQUU7d0JBQ0gsQ0FBQSxHQUFBLGlCQUFTLENBQUEsRUFBRSxDQUFBO3dCQUNYLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtvQkFDcEMsQ0FBQztpQkFDRixDQUFBO2dCQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtvQkFDckIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENB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QVUsQ0FBQyxJQUFZO1FBQzlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDakcsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNhbmRib3ggfSBmcm9tIFwidHlwZXNjcmlwdGxhbmctb3JnL3N0YXRpYy9qcy9zYW5kYm94XCJcbmltcG9ydCB7IFBsYXlncm91bmRQbHVnaW4sIFBsdWdpbkZhY3RvcnkgfSBmcm9tIFwiLi5cIlxuaW1wb3J0IHsgY3JlYXRlVUksIFVJIH0gZnJvbSBcIi4uL2NyZWF0ZVVJXCJcbmltcG9ydCB7IGxvY2FsaXplIH0gZnJvbSBcIi4uL2xvY2FsaXplV2l0aEZhbGxiYWNrXCJcblxubGV0IGFsbExvZ3M6IHN0cmluZ1tdID0gW11cbmxldCBhZGRlZENsZWFyQWN0aW9uID0gZmFsc2VcbmNvbnN0IGNhbmNlbEJ1dHRvblNWRyA9IGBcbjxzdmcgd2lkdGg9XCIxM1wiIGhlaWdodD1cIjEzXCIgdmlld0JveD1cIjAgMCAxMyAxM1wiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxuPGNpcmNsZSBjeD1cIjZcIiBjeT1cIjdcIiByPVwiNVwiIHN0cm9rZS13aWR0aD1cIjJcIi8+XG48bGluZSB4MT1cIjAuNzA3MTA3XCIgeTE9XCIxLjI5Mjg5XCIgeDI9XCIxMS43MDcxXCIgeTI9XCIxMi4yOTI5XCIgc3Ryb2tlLXdpZHRoPVwiMlwiLz5cbjwvc3ZnPlxuYFxuXG5leHBvcnQgY29uc3QgcnVuUGx1Z2luOiBQbHVnaW5GYWN0b3J5ID0gKGksIHV0aWxzKSA9PiB7XG4gIGNvbnN0IHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbiA9IHtcbiAgICBpZDogXCJsb2dzXCIsXG4gICAgZGlzcGxheU5hbWU6IGkoXCJwbGF5X3NpZGViYXJfbG9nc1wiKSxcbiAgICB3aWxsTW91bnQ6IChzYW5kYm94LCBjb250YWluZXIpID0+IHtcbiAgICAgIGNvbnN0IHVpID0gY3JlYXRlVUkoKVxuXG4gICAgICBjb25zdCBjbGVhckxvZ3NBY3Rpb24gPSB7XG4gICAgICAgIGlkOiBcImNsZWFyLWxvZ3MtcGxheVwiLFxuICAgICAgICBsYWJlbDogXCJDbGVhciBQbGF5Z3JvdW5kIExvZ3NcIixcbiAgICAgICAga2V5YmluZGluZ3M6IFtzYW5kYm94Lm1vbmFjby5LZXlNb2QuQ3RybENtZCB8IHNhbmRib3gubW9uYWNvLktleUNvZGUuS0VZX0tdLFxuXG4gICAgICAgIGNvbnRleHRNZW51R3JvdXBJZDogXCJydW5cIixcbiAgICAgICAgY29udGV4dE1lbnVPcmRlcjogMS41LFxuXG4gICAgICAgIHJ1bjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNsZWFyTG9ncygpXG4gICAgICAgICAgdWkuZmxhc2hJbmZvKGkoXCJwbGF5X2NsZWFyX2xvZ3NcIikpXG4gICAgICAgIH0sXG4gICAgICB9XG5cbiAgICAgIGlmICghYWRkZWRDbGVhckFjdGlvbikge1xuICAgICAgICBzYW5kYm94LmVkaXRvci5hZGRBY3Rpb24oY2xlYXJMb2dzQWN0aW9uKVxuICAgICAgICBhZGRlZENsZWFyQWN0aW9uID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBjb25zdCBlcnJvclVMID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgZXJyb3JVTC5pZCA9IFwibG9nLWNvbnRhaW5lclwiXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZXJyb3JVTClcblxuICAgICAgY29uc3QgbG9ncyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgIGxvZ3MuaWQgPSBcImxvZ1wiXG4gICAgICBsb2dzLmlubmVySFRNTCA9IGFsbExvZ3Muam9pbihcIjxociAvPlwiKVxuICAgICAgZXJyb3JVTC5hcHBlbmRDaGlsZChsb2dzKVxuXG4gICAgICBjb25zdCBsb2dUb29sc0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgIGxvZ1Rvb2xzQ29udGFpbmVyLmlkID0gXCJsb2ctdG9vbHNcIlxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGxvZ1Rvb2xzQ29udGFpbmVyKVxuXG4gICAgICBjb25zdCBjbGVhckxvZ3NCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICBjbGVhckxvZ3NCdXR0b24uaWQgPSBcImNsZWFyLWxvZ3MtYnV0dG9uXCJcbiAgICAgIGNsZWFyTG9nc0J1dHRvbi5pbm5lckhUTUwgPSBjYW5jZWxCdXR0b25TVkdcbiAgICAgIGNsZWFyTG9nc0J1dHRvbi5vbmNsaWNrID0gZSA9PiB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBjbGVhckxvZ3NBY3Rpb24ucnVuKClcblxuICAgICAgICBjb25zdCBmaWx0ZXJUZXh0Qm94OiBhbnkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZpbHRlci1sb2dzXCIpXG4gICAgICAgIGZpbHRlclRleHRCb3ghLnZhbHVlID0gXCJcIlxuICAgICAgfVxuICAgICAgbG9nVG9vbHNDb250YWluZXIuYXBwZW5kQ2hpbGQoY2xlYXJMb2dzQnV0dG9uKVxuXG4gICAgICBjb25zdCBmaWx0ZXJUZXh0Qm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpXG4gICAgICBmaWx0ZXJUZXh0Qm94LmlkID0gXCJmaWx0ZXItbG9nc1wiXG4gICAgICBmaWx0ZXJUZXh0Qm94LnBsYWNlaG9sZGVyID0gaShcInBsYXlfc2lkZWJhcl90b29sc19maWx0ZXJfcGxhY2Vob2xkZXJcIilcbiAgICAgIGZpbHRlclRleHRCb3guYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIChlOiBhbnkpID0+IHtcbiAgICAgICAgY29uc3QgaW5wdXRUZXh0ID0gZS50YXJnZXQudmFsdWVcblxuICAgICAgICBjb25zdCBlbGVMb2cgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxvZ1wiKSFcbiAgICAgICAgZWxlTG9nLmlubmVySFRNTCA9IGFsbExvZ3NcbiAgICAgICAgICAuZmlsdGVyKGxvZyA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VyTG9nZ2VkVGV4dCA9IGxvZy5zdWJzdHJpbmcobG9nLmluZGV4T2YoXCI6XCIpICsgMSwgbG9nLmluZGV4T2YoXCImbmJzcDs8YnI+XCIpKVxuICAgICAgICAgICAgcmV0dXJuIHVzZXJMb2dnZWRUZXh0LmluY2x1ZGVzKGlucHV0VGV4dClcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5qb2luKFwiPGhyIC8+XCIpXG5cbiAgICAgICAgaWYgKGlucHV0VGV4dCA9PT0gXCJcIikge1xuICAgICAgICAgIGNvbnN0IGxvZ0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9nLWNvbnRhaW5lclwiKSFcbiAgICAgICAgICBsb2dDb250YWluZXIuc2Nyb2xsVG9wID0gbG9nQ29udGFpbmVyLnNjcm9sbEhlaWdodFxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgbG9nVG9vbHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZmlsdGVyVGV4dEJveClcblxuICAgICAgaWYgKGFsbExvZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnN0IG5vRXJyb3JzTWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgbm9FcnJvcnNNZXNzYWdlLmlkID0gXCJlbXB0eS1tZXNzYWdlLWNvbnRhaW5lclwiXG4gICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChub0Vycm9yc01lc3NhZ2UpXG5cbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgbWVzc2FnZS50ZXh0Q29udGVudCA9IGxvY2FsaXplKFwicGxheV9zaWRlYmFyX2xvZ3Nfbm9fbG9nc1wiLCBcIk5vIGxvZ3NcIilcbiAgICAgICAgbWVzc2FnZS5jbGFzc0xpc3QuYWRkKFwiZW1wdHktcGx1Z2luLW1lc3NhZ2VcIilcbiAgICAgICAgbm9FcnJvcnNNZXNzYWdlLmFwcGVuZENoaWxkKG1lc3NhZ2UpXG5cbiAgICAgICAgZXJyb3JVTC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgICAgbG9nVG9vbHNDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG4gICAgICB9XG4gICAgfSxcbiAgfVxuXG4gIHJldHVybiBwbHVnaW5cbn1cblxuZXhwb3J0IGNvbnN0IGNsZWFyTG9ncyA9ICgpID0+IHtcbiAgYWxsTG9ncyA9IFtdXG4gIGNvbnN0IGxvZ3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxvZ1wiKVxuICBpZiAobG9ncykge1xuICAgIGxvZ3MudGV4dENvbnRlbnQgPSBcIlwiXG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IHJ1bldpdGhDdXN0b21Mb2dzID0gKGNsb3N1cmU6IFByb21pc2U8c3RyaW5nPiwgaTogRnVuY3Rpb24pID0+IHtcbiAgY29uc3Qgbm9Mb2dzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbXB0eS1tZXNzYWdlLWNvbnRhaW5lclwiKVxuICBjb25zdCBsb2dDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxvZy1jb250YWluZXJcIikhXG4gIGNvbnN0IGxvZ1Rvb2xzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2ctdG9vbHNcIikhXG4gIGlmIChub0xvZ3MpIHtcbiAgICBub0xvZ3Muc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG4gICAgbG9nQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICBsb2dUb29sc0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJmbGV4XCJcbiAgfVxuXG4gIHJld2lyZUxvZ2dpbmdUb0VsZW1lbnQoXG4gICAgKCkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2dcIikhLFxuICAgICgpID0+IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9nLWNvbnRhaW5lclwiKSEsXG4gICAgY2xvc3VyZSxcbiAgICB0cnVlLFxuICAgIGlcbiAgKVxufVxuXG4vLyBUaGFua3MgU086IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzIwMjU2NzYwL2phdmFzY3JpcHQtY29uc29sZS1sb2ctdG8taHRtbC8zNTQ0OTI1NiMzNTQ0OTI1NlxuXG5mdW5jdGlvbiByZXdpcmVMb2dnaW5nVG9FbGVtZW50KFxuICBlbGVMb2NhdG9yOiAoKSA9PiBFbGVtZW50LFxuICBlbGVPdmVyZmxvd0xvY2F0b3I6ICgpID0+IEVsZW1lbnQsXG4gIGNsb3N1cmU6IFByb21pc2U8c3RyaW5nPixcbiAgYXV0b1Njcm9sbDogYm9vbGVhbixcbiAgaTogRnVuY3Rpb25cbikge1xuICBjb25zdCByYXdDb25zb2xlID0gY29uc29sZVxuXG4gIGNsb3N1cmUudGhlbihqcyA9PiB7XG4gICAgY29uc3QgcmVwbGFjZSA9IHt9IGFzIGFueVxuICAgIGJpbmRMb2dnaW5nRnVuYyhyZXBsYWNlLCByYXdDb25zb2xlLCBcImxvZ1wiLCBcIkxPR1wiKVxuICAgIGJpbmRMb2dnaW5nRnVuYyhyZXBsYWNlLCByYXdDb25zb2xlLCBcImRlYnVnXCIsIFwiREJHXCIpXG4gICAgYmluZExvZ2dpbmdGdW5jKHJlcGxhY2UsIHJhd0NvbnNvbGUsIFwid2FyblwiLCBcIldSTlwiKVxuICAgIGJpbmRMb2dnaW5nRnVuYyhyZXBsYWNlLCByYXdDb25zb2xlLCBcImVycm9yXCIsIFwiRVJSXCIpXG4gICAgcmVwbGFjZVtcImNsZWFyXCJdID0gY2xlYXJMb2dzXG4gICAgY29uc3QgY29uc29sZSA9IE9iamVjdC5hc3NpZ24oe30sIHJhd0NvbnNvbGUsIHJlcGxhY2UpXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNhZmVKUyA9IHNhbml0aXplSlMoanMpXG4gICAgICBldmFsKHNhZmVKUylcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihpKFwicGxheV9ydW5fanNfZmFpbFwiKSlcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpXG5cbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFN5bnRheEVycm9yICYmIC9cXGJleHBvcnRcXGIvdS50ZXN0KGVycm9yLm1lc3NhZ2UpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignVGlwOiBDaGFuZ2UgdGhlIE1vZHVsZSBzZXR0aW5nIHRvIFwiQ29tbW9uSlNcIiBpbiBUUyBDb25maWcgc2V0dGluZ3MgdG8gYWxsb3cgdG9wLWxldmVsIGV4cG9ydHMgdG8gd29yayBpbiB0aGUgUGxheWdyb3VuZCcpXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGZ1bmN0aW9uIGJpbmRMb2dnaW5nRnVuYyhvYmo6IGFueSwgcmF3OiBhbnksIG5hbWU6IHN0cmluZywgaWQ6IHN0cmluZykge1xuICAgIG9ialtuYW1lXSA9IGZ1bmN0aW9uICguLi5vYmpzOiBhbnlbXSkge1xuICAgICAgY29uc3Qgb3V0cHV0ID0gcHJvZHVjZU91dHB1dChvYmpzKVxuICAgICAgY29uc3QgZWxlTG9nID0gZWxlTG9jYXRvcigpXG4gICAgICBjb25zdCBwcmVmaXggPSBgWzxzcGFuIGNsYXNzPVwibG9nLSR7bmFtZX1cIj4ke2lkfTwvc3Bhbj5dOiBgXG4gICAgICBjb25zdCBlbGVDb250YWluZXJMb2cgPSBlbGVPdmVyZmxvd0xvY2F0b3IoKVxuICAgICAgYWxsTG9ncy5wdXNoKGAke3ByZWZpeH0ke291dHB1dH08YnI+YClcbiAgICAgIGVsZUxvZy5pbm5lckhUTUwgPSBhbGxMb2dzLmpvaW4oXCI8aHIgLz5cIilcbiAgICAgIGlmIChhdXRvU2Nyb2xsICYmIGVsZUNvbnRhaW5lckxvZykge1xuICAgICAgICBlbGVDb250YWluZXJMb2cuc2Nyb2xsVG9wID0gZWxlQ29udGFpbmVyTG9nLnNjcm9sbEhlaWdodFxuICAgICAgfVxuICAgICAgcmF3W25hbWVdKC4uLm9ianMpXG4gICAgfVxuICB9XG5cbiAgY29uc3Qgb2JqZWN0VG9UZXh0ID0gKGFyZzogYW55KTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpc09iaiA9IHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCJcbiAgICBsZXQgdGV4dFJlcCA9IFwiXCJcbiAgICBpZiAoYXJnICYmIGFyZy5zdGFjayAmJiBhcmcubWVzc2FnZSkge1xuICAgICAgLy8gc3BlY2lhbCBjYXNlIGZvciBlcnJcbiAgICAgIHRleHRSZXAgPSBhcmcubWVzc2FnZVxuICAgIH0gZWxzZSBpZiAoYXJnID09PSBudWxsKSB7XG4gICAgICB0ZXh0UmVwID0gXCI8c3BhbiBjbGFzcz0nbGl0ZXJhbCc+bnVsbDwvc3Bhbj5cIlxuICAgIH0gZWxzZSBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRleHRSZXAgPSBcIjxzcGFuIGNsYXNzPSdsaXRlcmFsJz51bmRlZmluZWQ8L3NwYW4+XCJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09IFwic3ltYm9sXCIpIHtcbiAgICAgIHRleHRSZXAgPSBgPHNwYW4gY2xhc3M9J2xpdGVyYWwnPiR7U3RyaW5nKGFyZyl9PC9zcGFuPmBcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuICAgICAgdGV4dFJlcCA9IFwiW1wiICsgYXJnLm1hcChvYmplY3RUb1RleHQpLmpvaW4oXCI8c3BhbiBjbGFzcz0nY29tbWEnPiwgPC9zcGFuPlwiKSArIFwiXVwiXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYXJnID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB0ZXh0UmVwID0gJ1wiJyArIGFyZyArICdcIidcbiAgICB9IGVsc2UgaWYgKGlzT2JqKSB7XG4gICAgICBjb25zdCBuYW1lID0gYXJnLmNvbnN0cnVjdG9yICYmIGFyZy5jb25zdHJ1Y3Rvci5uYW1lXG4gICAgICAvLyBObyBvbmUgbmVlZHMgdG8ga25vdyBhbiBvYmogaXMgYW4gb2JqXG4gICAgICBjb25zdCBuYW1lV2l0aG91dE9iamVjdCA9IG5hbWUgJiYgbmFtZSA9PT0gXCJPYmplY3RcIiA/IFwiXCIgOiBuYW1lXG4gICAgICBjb25zdCBwcmVmaXggPSBuYW1lV2l0aG91dE9iamVjdCA/IGAke25hbWVXaXRob3V0T2JqZWN0fTogYCA6IFwiXCJcblxuICAgICAgLy8gSlNPTi5zdHJpbmdpZnkgb21pdHMgYW55IGtleXMgd2l0aCBhIHZhbHVlIG9mIHVuZGVmaW5lZC4gVG8gZ2V0IGFyb3VuZCB0aGlzLCB3ZSByZXBsYWNlIHVuZGVmaW5lZCB3aXRoIHRoZSB0ZXh0IF9fdW5kZWZpbmVkX18gYW5kIHRoZW4gZG8gYSBnbG9iYWwgcmVwbGFjZSB1c2luZyByZWdleCBiYWNrIHRvIGtleXdvcmQgdW5kZWZpbmVkXG4gICAgICB0ZXh0UmVwID0gcHJlZml4ICsgSlNPTi5zdHJpbmdpZnkoYXJnLCAoXywgdmFsdWUpID0+IHZhbHVlID09PSB1bmRlZmluZWQgPyAnX191bmRlZmluZWRfXycgOiB2YWx1ZSwgMikucmVwbGFjZSgvXCJfX3VuZGVmaW5lZF9fXCIvZywgJ3VuZGVmaW5lZCcpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRleHRSZXAgPSBTdHJpbmcoYXJnKVxuICAgIH1cbiAgICByZXR1cm4gdGV4dFJlcFxuICB9XG5cbiAgZnVuY3Rpb24gcHJvZHVjZU91dHB1dChhcmdzOiBhbnlbXSkge1xuICAgIHJldHVybiBhcmdzLnJlZHVjZSgob3V0cHV0OiBhbnksIGFyZzogYW55LCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgdGV4dFJlcCA9IG9iamVjdFRvVGV4dChhcmcpXG4gICAgICBjb25zdCBzaG93Q29tbWEgPSBpbmRleCAhPT0gYXJncy5sZW5ndGggLSAxXG4gICAgICBjb25zdCBjb21tYSA9IHNob3dDb21tYSA/IFwiPHNwYW4gY2xhc3M9J2NvbW1hJz4sIDwvc3Bhbj5cIiA6IFwiXCJcbiAgICAgIHJldHVybiBvdXRwdXQgKyB0ZXh0UmVwICsgY29tbWEgKyBcIiZuYnNwO1wiXG4gICAgfSwgXCJcIilcbiAgfVxufVxuXG4vLyBUaGUgcmVmbGVjdC1tZXRhZGF0YSBydW50aW1lIGlzIGF2YWlsYWJsZSwgc28gYWxsb3cgdGhhdCB0byBnbyB0aHJvdWdoXG5mdW5jdGlvbiBzYW5pdGl6ZUpTKGNvZGU6IHN0cmluZykge1xuICByZXR1cm4gY29kZS5yZXBsYWNlKGBpbXBvcnQgXCJyZWZsZWN0LW1ldGFkYXRhXCJgLCBcIlwiKS5yZXBsYWNlKGByZXF1aXJlKFwicmVmbGVjdC1tZXRhZGF0YVwiKWAsIFwiXCIpXG59XG4iXX0=