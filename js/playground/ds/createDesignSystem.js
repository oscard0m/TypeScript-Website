define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDesignSystem = void 0;
    const el = (str, elementType, container) => {
        const el = document.createElement(elementType);
        el.innerHTML = str;
        container.appendChild(el);
        return el;
    };
    // The Playground Plugin design system
    const createDesignSystem = (sandbox) => {
        const ts = sandbox.ts;
        return (container) => {
            const clear = () => {
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            };
            let decorations = [];
            let decorationLock = false;
            const clearDeltaDecorators = (force) => {
                // console.log(`clearing, ${decorations.length}}`)
                // console.log(sandbox.editor.getModel()?.getAllDecorations())
                if (force) {
                    sandbox.editor.deltaDecorations(decorations, []);
                    decorations = [];
                    decorationLock = false;
                }
                else if (!decorationLock) {
                    sandbox.editor.deltaDecorations(decorations, []);
                    decorations = [];
                }
            };
            /** Lets a HTML Element hover to highlight code in the editor  */
            const addEditorHoverToElement = (element, pos, config) => {
                element.onmouseenter = () => {
                    if (!decorationLock) {
                        const model = sandbox.getModel();
                        const start = model.getPositionAt(pos.start);
                        const end = model.getPositionAt(pos.end);
                        decorations = sandbox.editor.deltaDecorations(decorations, [
                            {
                                range: new sandbox.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                options: { inlineClassName: "highlight-" + config.type },
                            },
                        ]);
                    }
                };
                element.onmouseleave = () => {
                    clearDeltaDecorators();
                };
            };
            const declareRestartRequired = (i) => {
                if (document.getElementById("restart-required"))
                    return;
                const localize = i || window.i;
                const li = document.createElement("li");
                li.id = "restart-required";
                const a = document.createElement("a");
                a.style.color = "#c63131";
                a.textContent = localize("play_sidebar_options_restart_required");
                a.href = "#";
                a.onclick = () => document.location.reload();
                const nav = document.getElementsByClassName("navbar-right")[0];
                li.appendChild(a);
                nav.insertBefore(li, nav.firstChild);
            };
            const localStorageOption = (setting) => {
                // Think about this as being something which you want enabled by default and can suppress whether
                // it should do something.
                const invertedLogic = setting.emptyImpliesEnabled;
                const li = document.createElement("li");
                const label = document.createElement("label");
                const split = setting.oneline ? "" : "<br/>";
                label.innerHTML = `<span>${setting.display}</span>${split}${setting.blurb}`;
                const key = setting.flag;
                const input = document.createElement("input");
                input.type = "checkbox";
                input.id = key;
                input.checked = invertedLogic ? !localStorage.getItem(key) : !!localStorage.getItem(key);
                input.onchange = () => {
                    if (input.checked) {
                        if (!invertedLogic)
                            localStorage.setItem(key, "true");
                        else
                            localStorage.removeItem(key);
                    }
                    else {
                        if (invertedLogic)
                            localStorage.setItem(key, "true");
                        else
                            localStorage.removeItem(key);
                    }
                    if (setting.onchange) {
                        setting.onchange(!!localStorage.getItem(key));
                    }
                    if (setting.requireRestart) {
                        declareRestartRequired();
                    }
                };
                label.htmlFor = input.id;
                li.appendChild(input);
                li.appendChild(label);
                container.appendChild(li);
                return li;
            };
            const button = (settings) => {
                const join = document.createElement("input");
                join.type = "button";
                join.value = settings.label;
                if (settings.onclick) {
                    join.onclick = settings.onclick;
                }
                container.appendChild(join);
                return join;
            };
            const code = (code) => {
                const createCodePre = document.createElement("pre");
                const codeElement = document.createElement("code");
                codeElement.innerHTML = code;
                createCodePre.appendChild(codeElement);
                container.appendChild(createCodePre);
                return codeElement;
            };
            const showEmptyScreen = (message) => {
                clear();
                const noErrorsMessage = document.createElement("div");
                noErrorsMessage.id = "empty-message-container";
                const messageDiv = document.createElement("div");
                messageDiv.textContent = message;
                messageDiv.classList.add("empty-plugin-message");
                noErrorsMessage.appendChild(messageDiv);
                container.appendChild(noErrorsMessage);
                return noErrorsMessage;
            };
            const createTabBar = () => {
                const tabBar = document.createElement("div");
                tabBar.classList.add("playground-plugin-tabview");
                /** Support left/right in the tab bar for accessibility */
                let tabFocus = 0;
                tabBar.addEventListener("keydown", e => {
                    const tabs = tabBar.querySelectorAll('[role="tab"]');
                    // Move right
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        tabs[tabFocus].setAttribute("tabindex", "-1");
                        if (e.key === "ArrowRight") {
                            tabFocus++;
                            // If we're at the end, go to the start
                            if (tabFocus >= tabs.length) {
                                tabFocus = 0;
                            }
                            // Move left
                        }
                        else if (e.key === "ArrowLeft") {
                            tabFocus--;
                            // If we're at the start, move to the end
                            if (tabFocus < 0) {
                                tabFocus = tabs.length - 1;
                            }
                        }
                        tabs[tabFocus].setAttribute("tabindex", "0");
                        tabs[tabFocus].focus();
                    }
                });
                container.appendChild(tabBar);
                return tabBar;
            };
            const createTabButton = (text) => {
                const element = document.createElement("button");
                element.setAttribute("role", "tab");
                element.textContent = text;
                return element;
            };
            const listDiags = (model, diags) => {
                const errorUL = document.createElement("ul");
                errorUL.className = "compiler-diagnostics";
                errorUL.onmouseleave = ev => {
                    clearDeltaDecorators();
                };
                container.appendChild(errorUL);
                diags.forEach(diag => {
                    const li = document.createElement("li");
                    li.classList.add("diagnostic");
                    switch (diag.category) {
                        case 0:
                            li.classList.add("warning");
                            break;
                        case 1:
                            li.classList.add("error");
                            break;
                        case 2:
                            li.classList.add("suggestion");
                            break;
                        case 3:
                            li.classList.add("message");
                            break;
                    }
                    if (typeof diag === "string") {
                        li.textContent = diag;
                    }
                    else {
                        li.textContent = sandbox.ts.flattenDiagnosticMessageText(diag.messageText, "\n", 4);
                    }
                    errorUL.appendChild(li);
                    if (diag.start && diag.length) {
                        addEditorHoverToElement(li, { start: diag.start, end: diag.start + diag.length }, { type: "error" });
                    }
                    li.onclick = () => {
                        if (diag.start && diag.length) {
                            const start = model.getPositionAt(diag.start);
                            sandbox.editor.revealLine(start.lineNumber);
                            const end = model.getPositionAt(diag.start + diag.length);
                            decorations = sandbox.editor.deltaDecorations(decorations, [
                                {
                                    range: new sandbox.monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
                                    options: { inlineClassName: "error-highlight", isWholeLine: true },
                                },
                            ]);
                            decorationLock = true;
                            setTimeout(() => {
                                decorationLock = false;
                                sandbox.editor.deltaDecorations(decorations, []);
                            }, 300);
                        }
                    };
                });
                return errorUL;
            };
            const showOptionList = (options, style) => {
                const ol = document.createElement("ol");
                ol.className = style.style === "separated" ? "playground-options" : "playground-options tight";
                options.forEach(option => {
                    if (style.style === "rows")
                        option.oneline = true;
                    if (style.requireRestart)
                        option.requireRestart = true;
                    const settingButton = localStorageOption(option);
                    ol.appendChild(settingButton);
                });
                container.appendChild(ol);
            };
            const createASTTree = (node, settings) => {
                const autoOpen = !settings || !settings.closedByDefault;
                const div = document.createElement("div");
                div.className = "ast";
                const infoForNode = (node) => {
                    const name = ts.SyntaxKind[node.kind];
                    return {
                        name,
                    };
                };
                const renderLiteralField = (key, value, info) => {
                    const li = document.createElement("li");
                    const typeofSpan = `ast-node-${typeof value}`;
                    let suffix = "";
                    if (key === "kind") {
                        suffix = ` (SyntaxKind.${info.name})`;
                    }
                    li.innerHTML = `${key}: <span class='${typeofSpan}'>${value}</span>${suffix}`;
                    return li;
                };
                const renderSingleChild = (key, value, depth) => {
                    const li = document.createElement("li");
                    li.innerHTML = `${key}: `;
                    renderItem(li, value, depth + 1);
                    return li;
                };
                const renderManyChildren = (key, nodes, depth) => {
                    const childers = document.createElement("div");
                    childers.classList.add("ast-children");
                    const li = document.createElement("li");
                    li.innerHTML = `${key}: [<br/>`;
                    childers.appendChild(li);
                    nodes.forEach(node => {
                        renderItem(childers, node, depth + 1);
                    });
                    const liEnd = document.createElement("li");
                    liEnd.innerHTML += "]";
                    childers.appendChild(liEnd);
                    return childers;
                };
                const renderItem = (parentElement, node, depth) => {
                    const itemDiv = document.createElement("div");
                    parentElement.appendChild(itemDiv);
                    itemDiv.className = "ast-tree-start";
                    itemDiv.attributes.setNamedItem;
                    // @ts-expect-error
                    itemDiv.dataset.pos = node.pos;
                    // @ts-expect-error
                    itemDiv.dataset.end = node.end;
                    // @ts-expect-error
                    itemDiv.dataset.depth = depth;
                    if (depth === 0 && autoOpen)
                        itemDiv.classList.add("open");
                    const info = infoForNode(node);
                    const a = document.createElement("a");
                    a.classList.add("node-name");
                    a.textContent = info.name;
                    itemDiv.appendChild(a);
                    a.onclick = _ => a.parentElement.classList.toggle("open");
                    addEditorHoverToElement(a, { start: node.pos, end: node.end }, { type: "info" });
                    const properties = document.createElement("ul");
                    properties.className = "ast-tree";
                    itemDiv.appendChild(properties);
                    Object.keys(node).forEach(field => {
                        if (typeof field === "function")
                            return;
                        if (field === "parent" || field === "flowNode")
                            return;
                        const value = node[field];
                        if (typeof value === "object" && Array.isArray(value) && value[0] && "pos" in value[0] && "end" in value[0]) {
                            //  Is an array of Nodes
                            properties.appendChild(renderManyChildren(field, value, depth));
                        }
                        else if (typeof value === "object" && "pos" in value && "end" in value) {
                            // Is a single child property
                            properties.appendChild(renderSingleChild(field, value, depth));
                        }
                        else {
                            properties.appendChild(renderLiteralField(field, value, info));
                        }
                    });
                };
                renderItem(div, node, 0);
                container.append(div);
                return div;
            };
            const createTextInput = (config) => {
                const form = document.createElement("form");
                const textbox = document.createElement("input");
                textbox.id = config.id;
                textbox.placeholder = config.placeholder;
                textbox.autocomplete = "off";
                textbox.autocapitalize = "off";
                textbox.spellcheck = false;
                // @ts-ignore
                textbox.autocorrect = "off";
                const localStorageKey = "playground-input-" + config.id;
                if (config.value) {
                    textbox.value = config.value;
                }
                else if (config.keepValueAcrossReloads) {
                    const storedQuery = localStorage.getItem(localStorageKey);
                    if (storedQuery)
                        textbox.value = storedQuery;
                }
                if (config.isEnabled) {
                    const enabled = config.isEnabled(textbox);
                    textbox.classList.add(enabled ? "good" : "bad");
                }
                else {
                    textbox.classList.add("good");
                }
                const textUpdate = (e) => {
                    const href = e.target.value.trim();
                    if (config.keepValueAcrossReloads) {
                        localStorage.setItem(localStorageKey, href);
                    }
                    if (config.onChanged)
                        config.onChanged(e.target.value, textbox);
                };
                textbox.style.width = "90%";
                textbox.style.height = "2rem";
                textbox.addEventListener("input", textUpdate);
                // Suppress the enter key
                textbox.onkeydown = (evt) => {
                    if (evt.key === "Enter" || evt.code === "Enter") {
                        config.onEnter(textbox.value, textbox);
                        return false;
                    }
                };
                form.appendChild(textbox);
                container.appendChild(form);
                return form;
            };
            return {
                /** Clear the sidebar */
                clear,
                /** Present code in a pre > code  */
                code,
                /** Ideally only use this once, and maybe even prefer using subtitles everywhere */
                title: (title) => el(title, "h3", container),
                /** Used to denote sections, give info etc */
                subtitle: (subtitle) => el(subtitle, "h4", container),
                /** Used to show a paragraph */
                p: (subtitle) => el(subtitle, "p", container),
                /** When you can't do something, or have nothing to show */
                showEmptyScreen,
                /**
                 * Shows a list of hoverable, and selectable items (errors, highlights etc) which have code representation.
                 * The type is quite small, so it should be very feasible for you to massage other data to fit into this function
                 */
                listDiags,
                /** Lets you remove the hovers from listDiags etc */
                clearDeltaDecorators,
                /** Shows a single option in local storage (adds an li to the container BTW) */
                localStorageOption,
                /** Uses localStorageOption to create a list of options */
                showOptionList,
                /** Shows a full-width text input */
                createTextInput,
                /** Renders an AST tree */
                createASTTree,
                /** Creates an input button */
                button,
                /** Used to re-create a UI like the tab bar at the top of the plugins section */
                createTabBar,
                /** Used with createTabBar to add buttons */
                createTabButton,
                /** A general "restart your browser" message  */
                declareRestartRequired,
            };
        };
    };
    exports.createDesignSystem = createDesignSystem;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRGVzaWduU3lzdGVtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGxheWdyb3VuZC9zcmMvZHMvY3JlYXRlRGVzaWduU3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFtQkEsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFXLEVBQUUsV0FBbUIsRUFBRSxTQUFrQixFQUFFLEVBQUU7UUFDbEUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxFQUFFLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQTtRQUNsQixTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pCLE9BQU8sRUFBRSxDQUFBO0lBQ1gsQ0FBQyxDQUFBO0lBRUQsc0NBQXNDO0lBQy9CLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxPQUFnQixFQUFFLEVBQUU7UUFDckQsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQTtRQUVyQixPQUFPLENBQUMsU0FBa0IsRUFBRSxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRTtnQkFDakIsT0FBTyxTQUFTLENBQUMsVUFBVSxFQUFFO29CQUMzQixTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtpQkFDNUM7WUFDSCxDQUFDLENBQUE7WUFDRCxJQUFJLFdBQVcsR0FBYSxFQUFFLENBQUE7WUFDOUIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFBO1lBRTFCLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxLQUFZLEVBQUUsRUFBRTtnQkFDNUMsa0RBQWtEO2dCQUNsRCw4REFBOEQ7Z0JBQzlELElBQUksS0FBSyxFQUFFO29CQUNULE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUNoRCxXQUFXLEdBQUcsRUFBRSxDQUFBO29C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QUNMLG9DQUFvQztnQkFDcEMsSUFBSTtnQkFDSixtRkFBbUY7Z0JBQ25GLEtBQUssRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDO2dCQUNwRCw2Q0FBNkM7Z0JBQzdDLFFBQVEsRUFBRSxDQUFDLFFBQWdCLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQztnQkFDN0QsK0JBQStCO2dCQUMvQixDQUFDLEVBQUUsQ0FBQyxRQUFnQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUM7Z0JBQ3JELDJEQUEyRDtnQkFDM0QsZUFBZTtnQkFDZjs7O21CQUdHO2dCQUNILFNBQVM7Z0JBQ1Qsb0RBQW9EO2dCQUNwRCxvQkFBb0I7Z0JBQ3BCLCtFQUErRTtnQkFDL0Usa0JBQWtCO2dCQUNsQiwwREFBMEQ7Z0JBQzFELGNBQWM7Z0JBQ2Qsb0NBQW9DO2dCQUNwQyxlQUFlO2dCQUNmLDBCQUEwQjtnQkFDMUIsYUFBYTtnQkFDYiw4QkFBOEI7Z0JBQzlCLE1BQU07Z0JBQ04sZ0ZBQWdGO2dCQUNoRixZQUFZO2dCQUNaLDRDQUE0QztnQkFDNUMsZUFBZTtnQkFDZixnREFBZ0Q7Z0JBQ2hELHNCQUFzQjthQUN2QixDQUFBO1FBQ0gsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFBO0lBeGRZLFFBQUEsa0JBQWtCLHNCQXdkOUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdHlwZSB7IFNhbmRib3ggfSBmcm9tIFwidHlwZXNjcmlwdGxhbmctb3JnL3N0YXRpYy9qcy9zYW5kYm94XCJcbmltcG9ydCB0eXBlIHsgRGlhZ25vc3RpY1JlbGF0ZWRJbmZvcm1hdGlvbiwgTm9kZSB9IGZyb20gXCJ0eXBlc2NyaXB0XCJcblxuZXhwb3J0IHR5cGUgTG9jYWxTdG9yYWdlT3B0aW9uID0ge1xuICBibHVyYjogc3RyaW5nXG4gIGZsYWc6IHN0cmluZ1xuICBkaXNwbGF5OiBzdHJpbmdcblxuICBlbXB0eUltcGxpZXNFbmFibGVkPzogdHJ1ZVxuICBvbmVsaW5lPzogdHJ1ZVxuICByZXF1aXJlUmVzdGFydD86IHRydWVcbiAgb25jaGFuZ2U/OiAobmV3VmFsdWU6IGJvb2xlYW4pID0+IHZvaWRcbn1cblxuZXhwb3J0IHR5cGUgT3B0aW9uc0xpc3RDb25maWcgPSB7XG4gIHN0eWxlOiBcInNlcGFyYXRlZFwiIHwgXCJyb3dzXCJcbiAgcmVxdWlyZVJlc3RhcnQ/OiB0cnVlXG59XG5cbmNvbnN0IGVsID0gKHN0cjogc3RyaW5nLCBlbGVtZW50VHlwZTogc3RyaW5nLCBjb250YWluZXI6IEVsZW1lbnQpID0+IHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KGVsZW1lbnRUeXBlKVxuICBlbC5pbm5lckhUTUwgPSBzdHJcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKGVsKVxuICByZXR1cm4gZWxcbn1cblxuLy8gVGhlIFBsYXlncm91bmQgUGx1Z2luIGRlc2lnbiBzeXN0ZW1cbmV4cG9ydCBjb25zdCBjcmVhdGVEZXNpZ25TeXN0ZW0gPSAoc2FuZGJveDogU2FuZGJveCkgPT4ge1xuICBjb25zdCB0cyA9IHNhbmRib3gudHNcblxuICByZXR1cm4gKGNvbnRhaW5lcjogRWxlbWVudCkgPT4ge1xuICAgIGNvbnN0IGNsZWFyID0gKCkgPT4ge1xuICAgICAgd2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG4gICAgICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZChjb250YWluZXIuZmlyc3RDaGlsZClcbiAgICAgIH1cbiAgICB9XG4gICAgbGV0IGRlY29yYXRpb25zOiBzdHJpbmdbXSA9IFtdXG4gICAgbGV0IGRlY29yYXRpb25Mb2NrID0gZmFsc2VcblxuICAgIGNvbnN0IGNsZWFyRGVsdGFEZWNvcmF0b3JzID0gKGZvcmNlPzogdHJ1ZSkgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coYGNsZWFyaW5nLCAke2RlY29yYXRpb25zLmxlbmd0aH19YClcbiAgICAgIC8vIGNvbnNvbGUubG9nKHNhbmRib3guZWRpdG9yLmdldE1vZGVsKCk/LmdldEFsbERlY29yYXRpb25zKCkpXG4gICAgICBpZiAoZm9yY2UpIHtcbiAgICAgICAgc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW10pXG4gICAgICAgIGRlY29yYXRpb25zID0gW11cbiAgICAgICAgZGVjb3JhdGlvbkxvY2sgPSBmYWxzZVxuICAgICAgfSBlbHNlIGlmICghZGVjb3JhdGlvbkxvY2spIHtcbiAgICAgICAgc2FuZGJveC5lZGl0b3IuZGVsdGFEZWNvcmF0aW9ucyhkZWNvcmF0aW9ucywgW10pXG4gICAgICAgIGRlY29yYXRpb25zID0gW11cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiogTGV0cyBhIEhUTUwgRWxlbWVudCBob3ZlciB0byBoaWdobGlnaHQgY29kZSBpbiB0aGUgZWRpdG9yICAqL1xuICAgIGNvbnN0IGFkZEVkaXRvckhvdmVyVG9FbGVtZW50ID0gKFxuICAgICAgZWxlbWVudDogSFRNTEVsZW1lbnQsXG4gICAgICBwb3M6IHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfSxcbiAgICAgIGNvbmZpZzogeyB0eXBlOiBcImVycm9yXCIgfCBcImluZm9cIiB9XG4gICAgKSA9PiB7XG4gICAgICBlbGVtZW50Lm9ubW91c2VlbnRlciA9ICgpID0+IHtcbiAgICAgICAgaWYgKCFkZWNvcmF0aW9uTG9jaykge1xuICAgICAgICAgIGNvbnN0IG1vZGVsID0gc2FuZGJveC5nZXRNb2RlbCgpXG4gICAgICAgICAgY29uc3Qgc3RhcnQgPSBtb2RlbC5nZXRQb3NpdGlvbkF0KHBvcy5zdGFydClcbiAgICAgICAgICBjb25zdCBlbmQgPSBtb2RlbC5nZXRQb3NpdGlvbkF0KHBvcy5lbmQpXG5cbiAgICAgICAgICBkZWNvcmF0aW9ucyA9IHNhbmRib3guZWRpdG9yLmRlbHRhRGVjb3JhdGlvbnMoZGVjb3JhdGlvbnMsIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgcmFuZ2U6IG5ldyBzYW5kYm94Lm1vbmFjby5SYW5nZShzdGFydC5saW5lTnVtYmVyLCBzdGFydC5jb2x1bW4sIGVuZC5saW5lTnVtYmVyLCBlbmQuY29sdW1uKSxcbiAgICAgICAgICAgICAgb3B0aW9uczogeyBpbmxpbmVDbGFzc05hbWU6IFwiaGlnaGxpZ2h0LVwiICsgY29uZmlnLnR5cGUgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBlbGVtZW50Lm9ubW91c2VsZWF2ZSA9ICgpID0+IHtcbiAgICAgICAgY2xlYXJEZWx0YURlY29yYXRvcnMoKVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlY2xhcmVSZXN0YXJ0UmVxdWlyZWQgPSAoaT86IChrZXk6IHN0cmluZykgPT4gc3RyaW5nKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXN0YXJ0LXJlcXVpcmVkXCIpKSByZXR1cm5cbiAgICAgIGNvbnN0IGxvY2FsaXplID0gaSB8fCAod2luZG93IGFzIGFueSkuaVxuICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgIGxpLmlkID0gXCJyZXN0YXJ0LXJlcXVpcmVkXCJcblxuICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpXG4gICAgICBhLnN0eWxlLmNvbG9yID0gXCIjYzYzMTMxXCJcbiAgICAgIGEudGV4dENvbnRlbnQgPSBsb2NhbGl6ZShcInBsYXlfc2lkZWJhcl9vcHRpb25zX3Jlc3RhcnRfcmVxdWlyZWRcIilcbiAgICAgIGEuaHJlZiA9IFwiI1wiXG4gICAgICBhLm9uY2xpY2sgPSAoKSA9PiBkb2N1bWVudC5sb2NhdGlvbi5yZWxvYWQoKVxuXG4gICAgICBjb25zdCBuYXYgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwibmF2YmFyLXJpZ2h0XCIpWzBdXG4gICAgICBsaS5hcHBlbmRDaGlsZChhKVxuICAgICAgbmF2Lmluc2VydEJlZm9yZShsaSwgbmF2LmZpcnN0Q2hpbGQpXG4gICAgfVxuXG4gICAgY29uc3QgbG9jYWxTdG9yYWdlT3B0aW9uID0gKHNldHRpbmc6IExvY2FsU3RvcmFnZU9wdGlvbikgPT4ge1xuICAgICAgLy8gVGhpbmsgYWJvdXQgdGhpcyBhcyBiZWluZyBzb21ldGhpbmcgd2hpY2ggeW91IHdhbnQgZW5hYmxlZCBieSBkZWZhdWx0IGFuZCBjYW4gc3VwcHJlc3Mgd2hldGhlclxuICAgICAgLy8gaXQgc2hvdWxkIGRvIHNvbWV0aGluZy5cbiAgICAgIGNvbnN0IGludmVydGVkTG9naWMgPSBzZXR0aW5nLmVtcHR5SW1wbGllc0VuYWJsZWRcblxuICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxhYmVsXCIpXG4gICAgICBjb25zdCBzcGxpdCA9IHNldHRpbmcub25lbGluZSA/IFwiXCIgOiBcIjxici8+XCJcbiAgICAgIGxhYmVsLmlubmVySFRNTCA9IGA8c3Bhbj4ke3NldHRpbmcuZGlzcGxheX08L3NwYW4+JHtzcGxpdH0ke3NldHRpbmcuYmx1cmJ9YFxuXG4gICAgICBjb25zdCBrZXkgPSBzZXR0aW5nLmZsYWdcbiAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpXG4gICAgICBpbnB1dC50eXBlID0gXCJjaGVja2JveFwiXG4gICAgICBpbnB1dC5pZCA9IGtleVxuXG4gICAgICBpbnB1dC5jaGVja2VkID0gaW52ZXJ0ZWRMb2dpYyA/ICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpIDogISFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpXG5cbiAgICAgIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICBpZiAoaW5wdXQuY2hlY2tlZCkge1xuICAgICAgICAgIGlmICghaW52ZXJ0ZWRMb2dpYykgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCBcInRydWVcIilcbiAgICAgICAgICBlbHNlIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoaW52ZXJ0ZWRMb2dpYykgbG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCBcInRydWVcIilcbiAgICAgICAgICBlbHNlIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSlcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZXR0aW5nLm9uY2hhbmdlKSB7XG4gICAgICAgICAgc2V0dGluZy5vbmNoYW5nZSghIWxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSkpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNldHRpbmcucmVxdWlyZVJlc3RhcnQpIHtcbiAgICAgICAgICBkZWNsYXJlUmVzdGFydFJlcXVpcmVkKClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsYWJlbC5odG1sRm9yID0gaW5wdXQuaWRcblxuICAgICAgbGkuYXBwZW5kQ2hpbGQoaW5wdXQpXG4gICAgICBsaS5hcHBlbmRDaGlsZChsYWJlbClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChsaSlcbiAgICAgIHJldHVybiBsaVxuICAgIH1cblxuICAgIGNvbnN0IGJ1dHRvbiA9IChzZXR0aW5nczogeyBsYWJlbDogc3RyaW5nOyBvbmNsaWNrPzogKGV2OiBNb3VzZUV2ZW50KSA9PiB2b2lkIH0pID0+IHtcbiAgICAgIGNvbnN0IGpvaW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICAgIGpvaW4udHlwZSA9IFwiYnV0dG9uXCJcbiAgICAgIGpvaW4udmFsdWUgPSBzZXR0aW5ncy5sYWJlbFxuICAgICAgaWYgKHNldHRpbmdzLm9uY2xpY2spIHtcbiAgICAgICAgam9pbi5vbmNsaWNrID0gc2V0dGluZ3Mub25jbGlja1xuICAgICAgfVxuXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoam9pbilcbiAgICAgIHJldHVybiBqb2luXG4gICAgfVxuXG4gICAgY29uc3QgY29kZSA9IChjb2RlOiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGNyZWF0ZUNvZGVQcmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicHJlXCIpXG4gICAgICBjb25zdCBjb2RlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjb2RlXCIpXG5cbiAgICAgIGNvZGVFbGVtZW50LmlubmVySFRNTCA9IGNvZGVcblxuICAgICAgY3JlYXRlQ29kZVByZS5hcHBlbmRDaGlsZChjb2RlRWxlbWVudClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjcmVhdGVDb2RlUHJlKVxuXG4gICAgICByZXR1cm4gY29kZUVsZW1lbnRcbiAgICB9XG5cbiAgICBjb25zdCBzaG93RW1wdHlTY3JlZW4gPSAobWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gICAgICBjbGVhcigpXG5cbiAgICAgIGNvbnN0IG5vRXJyb3JzTWVzc2FnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgIG5vRXJyb3JzTWVzc2FnZS5pZCA9IFwiZW1wdHktbWVzc2FnZS1jb250YWluZXJcIlxuXG4gICAgICBjb25zdCBtZXNzYWdlRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgbWVzc2FnZURpdi50ZXh0Q29udGVudCA9IG1lc3NhZ2VcbiAgICAgIG1lc3NhZ2VEaXYuY2xhc3NMaXN0LmFkZChcImVtcHR5LXBsdWdpbi1tZXNzYWdlXCIpXG4gICAgICBub0Vycm9yc01lc3NhZ2UuYXBwZW5kQ2hpbGQobWVzc2FnZURpdilcblxuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5vRXJyb3JzTWVzc2FnZSlcbiAgICAgIHJldHVybiBub0Vycm9yc01lc3NhZ2VcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVUYWJCYXIgPSAoKSA9PiB7XG4gICAgICBjb25zdCB0YWJCYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICB0YWJCYXIuY2xhc3NMaXN0LmFkZChcInBsYXlncm91bmQtcGx1Z2luLXRhYnZpZXdcIilcblxuICAgICAgLyoqIFN1cHBvcnQgbGVmdC9yaWdodCBpbiB0aGUgdGFiIGJhciBmb3IgYWNjZXNzaWJpbGl0eSAqL1xuICAgICAgbGV0IHRhYkZvY3VzID0gMFxuICAgICAgdGFiQmFyLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGUgPT4ge1xuICAgICAgICBjb25zdCB0YWJzID0gdGFiQmFyLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tyb2xlPVwidGFiXCJdJylcbiAgICAgICAgLy8gTW92ZSByaWdodFxuICAgICAgICBpZiAoZS5rZXkgPT09IFwiQXJyb3dSaWdodFwiIHx8IGUua2V5ID09PSBcIkFycm93TGVmdFwiKSB7XG4gICAgICAgICAgdGFic1t0YWJGb2N1c10uc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgXCItMVwiKVxuICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJBcnJvd1JpZ2h0XCIpIHtcbiAgICAgICAgICAgIHRhYkZvY3VzKytcbiAgICAgICAgICAgIC8vIElmIHdlJ3JlIGF0IHRoZSBlbmQsIGdvIHRvIHRoZSBzdGFydFxuICAgICAgICAgICAgaWYgKHRhYkZvY3VzID49IHRhYnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHRhYkZvY3VzID0gMFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gTW92ZSBsZWZ0XG4gICAgICAgICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xuICAgICAgICAgICAgdGFiRm9jdXMtLVxuICAgICAgICAgICAgLy8gSWYgd2UncmUgYXQgdGhlIHN0YXJ0LCBtb3ZlIHRvIHRoZSBlbmRcbiAgICAgICAgICAgIGlmICh0YWJGb2N1cyA8IDApIHtcbiAgICAgICAgICAgICAgdGFiRm9jdXMgPSB0YWJzLmxlbmd0aCAtIDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0YWJzW3RhYkZvY3VzXS5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCBcIjBcIilcbiAgICAgICAgICA7KHRhYnNbdGFiRm9jdXNdIGFzIGFueSkuZm9jdXMoKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGFiQmFyKVxuICAgICAgcmV0dXJuIHRhYkJhclxuICAgIH1cblxuICAgIGNvbnN0IGNyZWF0ZVRhYkJ1dHRvbiA9ICh0ZXh0OiBzdHJpbmcpID0+IHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpXG4gICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJ0YWJcIilcbiAgICAgIGVsZW1lbnQudGV4dENvbnRlbnQgPSB0ZXh0XG4gICAgICByZXR1cm4gZWxlbWVudFxuICAgIH1cblxuICAgIGNvbnN0IGxpc3REaWFncyA9IChtb2RlbDogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSVRleHRNb2RlbCwgZGlhZ3M6IERpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSkgPT4ge1xuICAgICAgY29uc3QgZXJyb3JVTCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ1bFwiKVxuICAgICAgZXJyb3JVTC5jbGFzc05hbWUgPSBcImNvbXBpbGVyLWRpYWdub3N0aWNzXCJcbiAgICAgIGVycm9yVUwub25tb3VzZWxlYXZlID0gZXYgPT4ge1xuICAgICAgICBjbGVhckRlbHRhRGVjb3JhdG9ycygpXG4gICAgICB9XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZXJyb3JVTClcblxuICAgICAgZGlhZ3MuZm9yRWFjaChkaWFnID0+IHtcbiAgICAgICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcImRpYWdub3N0aWNcIilcbiAgICAgICAgc3dpdGNoIChkaWFnLmNhdGVnb3J5KSB7XG4gICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcIndhcm5pbmdcIilcbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZChcImVycm9yXCIpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGxpLmNsYXNzTGlzdC5hZGQoXCJzdWdnZXN0aW9uXCIpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGxpLmNsYXNzTGlzdC5hZGQoXCJtZXNzYWdlXCIpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkaWFnID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgbGkudGV4dENvbnRlbnQgPSBkaWFnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGkudGV4dENvbnRlbnQgPSBzYW5kYm94LnRzLmZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZVRleHQoZGlhZy5tZXNzYWdlVGV4dCwgXCJcXG5cIiwgNClcbiAgICAgICAgfVxuICAgICAgICBlcnJvclVMLmFwcGVuZENoaWxkKGxpKVxuXG4gICAgICAgIGlmIChkaWFnLnN0YXJ0ICYmIGRpYWcubGVuZ3RoKSB7XG4gICAgICAgICAgYWRkRWRpdG9ySG92ZXJUb0VsZW1lbnQobGksIHsgc3RhcnQ6IGRpYWcuc3RhcnQsIGVuZDogZGlhZy5zdGFydCArIGRpYWcubGVuZ3RoIH0sIHsgdHlwZTogXCJlcnJvclwiIH0pXG4gICAgICAgIH1cblxuICAgICAgICBsaS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgIGlmIChkaWFnLnN0YXJ0ICYmIGRpYWcubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBzdGFydCA9IG1vZGVsLmdldFBvc2l0aW9uQXQoZGlhZy5zdGFydClcbiAgICAgICAgICAgIHNhbmRib3guZWRpdG9yLnJldmVhbExpbmUoc3RhcnQubGluZU51bWJlcilcblxuICAgICAgICAgICAgY29uc3QgZW5kID0gbW9kZWwuZ2V0UG9zaXRpb25BdChkaWFnLnN0YXJ0ICsgZGlhZy5sZW5ndGgpXG4gICAgICAgICAgICBkZWNvcmF0aW9ucyA9IHNhbmRib3guZWRpdG9yLmRlbHRhRGVjb3JhdGlvbnMoZGVjb3JhdGlvbnMsIFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJhbmdlOiBuZXcgc2FuZGJveC5tb25hY28uUmFuZ2Uoc3RhcnQubGluZU51bWJlciwgc3RhcnQuY29sdW1uLCBlbmQubGluZU51bWJlciwgZW5kLmNvbHVtbiksXG4gICAgICAgICAgICAgICAgb3B0aW9uczogeyBpbmxpbmVDbGFzc05hbWU6IFwiZXJyb3ItaGlnaGxpZ2h0XCIsIGlzV2hvbGVMaW5lOiB0cnVlIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdKVxuXG4gICAgICAgICAgICBkZWNvcmF0aW9uTG9jayA9IHRydWVcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBkZWNvcmF0aW9uTG9jayA9IGZhbHNlXG4gICAgICAgICAgICAgIHNhbmRib3guZWRpdG9yLmRlbHRhRGVjb3JhdGlvbnMoZGVjb3JhdGlvbnMsIFtdKVxuICAgICAgICAgICAgfSwgMzAwKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHJldHVybiBlcnJvclVMXG4gICAgfVxuXG4gICAgY29uc3Qgc2hvd09wdGlvbkxpc3QgPSAob3B0aW9uczogTG9jYWxTdG9yYWdlT3B0aW9uW10sIHN0eWxlOiBPcHRpb25zTGlzdENvbmZpZykgPT4ge1xuICAgICAgY29uc3Qgb2wgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib2xcIilcbiAgICAgIG9sLmNsYXNzTmFtZSA9IHN0eWxlLnN0eWxlID09PSBcInNlcGFyYXRlZFwiID8gXCJwbGF5Z3JvdW5kLW9wdGlvbnNcIiA6IFwicGxheWdyb3VuZC1vcHRpb25zIHRpZ2h0XCJcblxuICAgICAgb3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgIGlmIChzdHlsZS5zdHlsZSA9PT0gXCJyb3dzXCIpIG9wdGlvbi5vbmVsaW5lID0gdHJ1ZVxuICAgICAgICBpZiAoc3R5bGUucmVxdWlyZVJlc3RhcnQpIG9wdGlvbi5yZXF1aXJlUmVzdGFydCA9IHRydWVcblxuICAgICAgICBjb25zdCBzZXR0aW5nQnV0dG9uID0gbG9jYWxTdG9yYWdlT3B0aW9uKG9wdGlvbilcbiAgICAgICAgb2wuYXBwZW5kQ2hpbGQoc2V0dGluZ0J1dHRvbilcbiAgICAgIH0pXG5cbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChvbClcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVBU1RUcmVlID0gKG5vZGU6IE5vZGUsIHNldHRpbmdzPzogeyBjbG9zZWRCeURlZmF1bHQ/OiB0cnVlIH0pID0+IHtcbiAgICAgIGNvbnN0IGF1dG9PcGVuID0gIXNldHRpbmdzIHx8ICFzZXR0aW5ncy5jbG9zZWRCeURlZmF1bHRcblxuICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgZGl2LmNsYXNzTmFtZSA9IFwiYXN0XCJcblxuICAgICAgY29uc3QgaW5mb0Zvck5vZGUgPSAobm9kZTogTm9kZSkgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gdHMuU3ludGF4S2luZFtub2RlLmtpbmRdXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lLFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHR5cGUgTm9kZUluZm8gPSBSZXR1cm5UeXBlPHR5cGVvZiBpbmZvRm9yTm9kZT5cblxuICAgICAgY29uc3QgcmVuZGVyTGl0ZXJhbEZpZWxkID0gKGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBpbmZvOiBOb2RlSW5mbykgPT4ge1xuICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBjb25zdCB0eXBlb2ZTcGFuID0gYGFzdC1ub2RlLSR7dHlwZW9mIHZhbHVlfWBcbiAgICAgICAgbGV0IHN1ZmZpeCA9IFwiXCJcbiAgICAgICAgaWYgKGtleSA9PT0gXCJraW5kXCIpIHtcbiAgICAgICAgICBzdWZmaXggPSBgIChTeW50YXhLaW5kLiR7aW5mby5uYW1lfSlgXG4gICAgICAgIH1cbiAgICAgICAgbGkuaW5uZXJIVE1MID0gYCR7a2V5fTogPHNwYW4gY2xhc3M9JyR7dHlwZW9mU3Bhbn0nPiR7dmFsdWV9PC9zcGFuPiR7c3VmZml4fWBcbiAgICAgICAgcmV0dXJuIGxpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbmRlclNpbmdsZUNoaWxkID0gKGtleTogc3RyaW5nLCB2YWx1ZTogTm9kZSwgZGVwdGg6IG51bWJlcikgPT4ge1xuICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaVwiKVxuICAgICAgICBsaS5pbm5lckhUTUwgPSBgJHtrZXl9OiBgXG5cbiAgICAgICAgcmVuZGVySXRlbShsaSwgdmFsdWUsIGRlcHRoICsgMSlcbiAgICAgICAgcmV0dXJuIGxpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbmRlck1hbnlDaGlsZHJlbiA9IChrZXk6IHN0cmluZywgbm9kZXM6IE5vZGVbXSwgZGVwdGg6IG51bWJlcikgPT4ge1xuICAgICAgICBjb25zdCBjaGlsZGVycyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgY2hpbGRlcnMuY2xhc3NMaXN0LmFkZChcImFzdC1jaGlsZHJlblwiKVxuXG4gICAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpXG4gICAgICAgIGxpLmlubmVySFRNTCA9IGAke2tleX06IFs8YnIvPmBcbiAgICAgICAgY2hpbGRlcnMuYXBwZW5kQ2hpbGQobGkpXG5cbiAgICAgICAgbm9kZXMuZm9yRWFjaChub2RlID0+IHtcbiAgICAgICAgICByZW5kZXJJdGVtKGNoaWxkZXJzLCBub2RlLCBkZXB0aCArIDEpXG4gICAgICAgIH0pXG5cbiAgICAgICAgY29uc3QgbGlFbmQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICAgICAgbGlFbmQuaW5uZXJIVE1MICs9IFwiXVwiXG4gICAgICAgIGNoaWxkZXJzLmFwcGVuZENoaWxkKGxpRW5kKVxuICAgICAgICByZXR1cm4gY2hpbGRlcnNcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVuZGVySXRlbSA9IChwYXJlbnRFbGVtZW50OiBFbGVtZW50LCBub2RlOiBOb2RlLCBkZXB0aDogbnVtYmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IGl0ZW1EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIHBhcmVudEVsZW1lbnQuYXBwZW5kQ2hpbGQoaXRlbURpdilcbiAgICAgICAgaXRlbURpdi5jbGFzc05hbWUgPSBcImFzdC10cmVlLXN0YXJ0XCJcbiAgICAgICAgaXRlbURpdi5hdHRyaWJ1dGVzLnNldE5hbWVkSXRlbVxuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAgIGl0ZW1EaXYuZGF0YXNldC5wb3MgPSBub2RlLnBvc1xuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAgIGl0ZW1EaXYuZGF0YXNldC5lbmQgPSBub2RlLmVuZFxuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXG4gICAgICAgIGl0ZW1EaXYuZGF0YXNldC5kZXB0aCA9IGRlcHRoXG5cbiAgICAgICAgaWYgKGRlcHRoID09PSAwICYmIGF1dG9PcGVuKSBpdGVtRGl2LmNsYXNzTGlzdC5hZGQoXCJvcGVuXCIpXG5cbiAgICAgICAgY29uc3QgaW5mbyA9IGluZm9Gb3JOb2RlKG5vZGUpXG5cbiAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpXG4gICAgICAgIGEuY2xhc3NMaXN0LmFkZChcIm5vZGUtbmFtZVwiKVxuICAgICAgICBhLnRleHRDb250ZW50ID0gaW5mby5uYW1lXG4gICAgICAgIGl0ZW1EaXYuYXBwZW5kQ2hpbGQoYSlcbiAgICAgICAgYS5vbmNsaWNrID0gXyA9PiBhLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIpXG4gICAgICAgIGFkZEVkaXRvckhvdmVyVG9FbGVtZW50KGEsIHsgc3RhcnQ6IG5vZGUucG9zLCBlbmQ6IG5vZGUuZW5kIH0sIHsgdHlwZTogXCJpbmZvXCIgfSlcblxuICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInVsXCIpXG4gICAgICAgIHByb3BlcnRpZXMuY2xhc3NOYW1lID0gXCJhc3QtdHJlZVwiXG4gICAgICAgIGl0ZW1EaXYuYXBwZW5kQ2hpbGQocHJvcGVydGllcylcblxuICAgICAgICBPYmplY3Qua2V5cyhub2RlKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIGZpZWxkID09PSBcImZ1bmN0aW9uXCIpIHJldHVyblxuICAgICAgICAgIGlmIChmaWVsZCA9PT0gXCJwYXJlbnRcIiB8fCBmaWVsZCA9PT0gXCJmbG93Tm9kZVwiKSByZXR1cm5cblxuICAgICAgICAgIGNvbnN0IHZhbHVlID0gKG5vZGUgYXMgYW55KVtmaWVsZF1cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlWzBdICYmIFwicG9zXCIgaW4gdmFsdWVbMF0gJiYgXCJlbmRcIiBpbiB2YWx1ZVswXSkge1xuICAgICAgICAgICAgLy8gIElzIGFuIGFycmF5IG9mIE5vZGVzXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmFwcGVuZENoaWxkKHJlbmRlck1hbnlDaGlsZHJlbihmaWVsZCwgdmFsdWUsIGRlcHRoKSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiBcInBvc1wiIGluIHZhbHVlICYmIFwiZW5kXCIgaW4gdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIElzIGEgc2luZ2xlIGNoaWxkIHByb3BlcnR5XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmFwcGVuZENoaWxkKHJlbmRlclNpbmdsZUNoaWxkKGZpZWxkLCB2YWx1ZSwgZGVwdGgpKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wZXJ0aWVzLmFwcGVuZENoaWxkKHJlbmRlckxpdGVyYWxGaWVsZChmaWVsZCwgdmFsdWUsIGluZm8pKVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgcmVuZGVySXRlbShkaXYsIG5vZGUsIDApXG4gICAgICBjb250YWluZXIuYXBwZW5kKGRpdilcbiAgICAgIHJldHVybiBkaXZcbiAgICB9XG5cbiAgICB0eXBlIFRleHRJbnB1dENvbmZpZyA9IHtcbiAgICAgIGlkOiBzdHJpbmdcbiAgICAgIHBsYWNlaG9sZGVyOiBzdHJpbmdcblxuICAgICAgb25DaGFuZ2VkPzogKHRleHQ6IHN0cmluZywgaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQpID0+IHZvaWRcbiAgICAgIG9uRW50ZXI6ICh0ZXh0OiBzdHJpbmcsIGlucHV0OiBIVE1MSW5wdXRFbGVtZW50KSA9PiB2b2lkXG5cbiAgICAgIHZhbHVlPzogc3RyaW5nXG4gICAgICBrZWVwVmFsdWVBY3Jvc3NSZWxvYWRzPzogdHJ1ZVxuICAgICAgaXNFbmFibGVkPzogKGlucHV0OiBIVE1MSW5wdXRFbGVtZW50KSA9PiBib29sZWFuXG4gICAgfVxuXG4gICAgY29uc3QgY3JlYXRlVGV4dElucHV0ID0gKGNvbmZpZzogVGV4dElucHV0Q29uZmlnKSA9PiB7XG4gICAgICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImZvcm1cIilcblxuICAgICAgY29uc3QgdGV4dGJveCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKVxuICAgICAgdGV4dGJveC5pZCA9IGNvbmZpZy5pZFxuICAgICAgdGV4dGJveC5wbGFjZWhvbGRlciA9IGNvbmZpZy5wbGFjZWhvbGRlclxuICAgICAgdGV4dGJveC5hdXRvY29tcGxldGUgPSBcIm9mZlwiXG4gICAgICB0ZXh0Ym94LmF1dG9jYXBpdGFsaXplID0gXCJvZmZcIlxuICAgICAgdGV4dGJveC5zcGVsbGNoZWNrID0gZmFsc2VcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIHRleHRib3guYXV0b2NvcnJlY3QgPSBcIm9mZlwiXG5cbiAgICAgIGNvbnN0IGxvY2FsU3RvcmFnZUtleSA9IFwicGxheWdyb3VuZC1pbnB1dC1cIiArIGNvbmZpZy5pZFxuXG4gICAgICBpZiAoY29uZmlnLnZhbHVlKSB7XG4gICAgICAgIHRleHRib3gudmFsdWUgPSBjb25maWcudmFsdWVcbiAgICAgIH0gZWxzZSBpZiAoY29uZmlnLmtlZXBWYWx1ZUFjcm9zc1JlbG9hZHMpIHtcbiAgICAgICAgY29uc3Qgc3RvcmVkUXVlcnkgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShsb2NhbFN0b3JhZ2VLZXkpXG4gICAgICAgIGlmIChzdG9yZWRRdWVyeSkgdGV4dGJveC52YWx1ZSA9IHN0b3JlZFF1ZXJ5XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcuaXNFbmFibGVkKSB7XG4gICAgICAgIGNvbnN0IGVuYWJsZWQgPSBjb25maWcuaXNFbmFibGVkKHRleHRib3gpXG4gICAgICAgIHRleHRib3guY2xhc3NMaXN0LmFkZChlbmFibGVkID8gXCJnb29kXCIgOiBcImJhZFwiKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGV4dGJveC5jbGFzc0xpc3QuYWRkKFwiZ29vZFwiKVxuICAgICAgfVxuXG4gICAgICBjb25zdCB0ZXh0VXBkYXRlID0gKGU6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBocmVmID0gZS50YXJnZXQudmFsdWUudHJpbSgpXG4gICAgICAgIGlmIChjb25maWcua2VlcFZhbHVlQWNyb3NzUmVsb2Fkcykge1xuICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGxvY2FsU3RvcmFnZUtleSwgaHJlZilcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlZCkgY29uZmlnLm9uQ2hhbmdlZChlLnRhcmdldC52YWx1ZSwgdGV4dGJveClcbiAgICAgIH1cblxuICAgICAgdGV4dGJveC5zdHlsZS53aWR0aCA9IFwiOTAlXCJcbiAgICAgIHRleHRib3guc3R5bGUuaGVpZ2h0ID0gXCIycmVtXCJcbiAgICAgIHRleHRib3guYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIHRleHRVcGRhdGUpXG5cbiAgICAgIC8vIFN1cHByZXNzIHRoZSBlbnRlciBrZXlcbiAgICAgIHRleHRib3gub25rZXlkb3duID0gKGV2dDogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZ0LmtleSA9PT0gXCJFbnRlclwiIHx8IGV2dC5jb2RlID09PSBcIkVudGVyXCIpIHtcbiAgICAgICAgICBjb25maWcub25FbnRlcih0ZXh0Ym94LnZhbHVlLCB0ZXh0Ym94KVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQodGV4dGJveClcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChmb3JtKVxuICAgICAgcmV0dXJuIGZvcm1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgLyoqIENsZWFyIHRoZSBzaWRlYmFyICovXG4gICAgICBjbGVhcixcbiAgICAgIC8qKiBQcmVzZW50IGNvZGUgaW4gYSBwcmUgPiBjb2RlICAqL1xuICAgICAgY29kZSxcbiAgICAgIC8qKiBJZGVhbGx5IG9ubHkgdXNlIHRoaXMgb25jZSwgYW5kIG1heWJlIGV2ZW4gcHJlZmVyIHVzaW5nIHN1YnRpdGxlcyBldmVyeXdoZXJlICovXG4gICAgICB0aXRsZTogKHRpdGxlOiBzdHJpbmcpID0+IGVsKHRpdGxlLCBcImgzXCIsIGNvbnRhaW5lciksXG4gICAgICAvKiogVXNlZCB0byBkZW5vdGUgc2VjdGlvbnMsIGdpdmUgaW5mbyBldGMgKi9cbiAgICAgIHN1YnRpdGxlOiAoc3VidGl0bGU6IHN0cmluZykgPT4gZWwoc3VidGl0bGUsIFwiaDRcIiwgY29udGFpbmVyKSxcbiAgICAgIC8qKiBVc2VkIHRvIHNob3cgYSBwYXJhZ3JhcGggKi9cbiAgICAgIHA6IChzdWJ0aXRsZTogc3RyaW5nKSA9PiBlbChzdWJ0aXRsZSwgXCJwXCIsIGNvbnRhaW5lciksXG4gICAgICAvKiogV2hlbiB5b3UgY2FuJ3QgZG8gc29tZXRoaW5nLCBvciBoYXZlIG5vdGhpbmcgdG8gc2hvdyAqL1xuICAgICAgc2hvd0VtcHR5U2NyZWVuLFxuICAgICAgLyoqXG4gICAgICAgKiBTaG93cyBhIGxpc3Qgb2YgaG92ZXJhYmxlLCBhbmQgc2VsZWN0YWJsZSBpdGVtcyAoZXJyb3JzLCBoaWdobGlnaHRzIGV0Yykgd2hpY2ggaGF2ZSBjb2RlIHJlcHJlc2VudGF0aW9uLlxuICAgICAgICogVGhlIHR5cGUgaXMgcXVpdGUgc21hbGwsIHNvIGl0IHNob3VsZCBiZSB2ZXJ5IGZlYXNpYmxlIGZvciB5b3UgdG8gbWFzc2FnZSBvdGhlciBkYXRhIHRvIGZpdCBpbnRvIHRoaXMgZnVuY3Rpb25cbiAgICAgICAqL1xuICAgICAgbGlzdERpYWdzLFxuICAgICAgLyoqIExldHMgeW91IHJlbW92ZSB0aGUgaG92ZXJzIGZyb20gbGlzdERpYWdzIGV0YyAqL1xuICAgICAgY2xlYXJEZWx0YURlY29yYXRvcnMsXG4gICAgICAvKiogU2hvd3MgYSBzaW5nbGUgb3B0aW9uIGluIGxvY2FsIHN0b3JhZ2UgKGFkZHMgYW4gbGkgdG8gdGhlIGNvbnRhaW5lciBCVFcpICovXG4gICAgICBsb2NhbFN0b3JhZ2VPcHRpb24sXG4gICAgICAvKiogVXNlcyBsb2NhbFN0b3JhZ2VPcHRpb24gdG8gY3JlYXRlIGEgbGlzdCBvZiBvcHRpb25zICovXG4gICAgICBzaG93T3B0aW9uTGlzdCxcbiAgICAgIC8qKiBTaG93cyBhIGZ1bGwtd2lkdGggdGV4dCBpbnB1dCAqL1xuICAgICAgY3JlYXRlVGV4dElucHV0LFxuICAgICAgLyoqIFJlbmRlcnMgYW4gQVNUIHRyZWUgKi9cbiAgICAgIGNyZWF0ZUFTVFRyZWUsXG4gICAgICAvKiogQ3JlYXRlcyBhbiBpbnB1dCBidXR0b24gKi9cbiAgICAgIGJ1dHRvbixcbiAgICAgIC8qKiBVc2VkIHRvIHJlLWNyZWF0ZSBhIFVJIGxpa2UgdGhlIHRhYiBiYXIgYXQgdGhlIHRvcCBvZiB0aGUgcGx1Z2lucyBzZWN0aW9uICovXG4gICAgICBjcmVhdGVUYWJCYXIsXG4gICAgICAvKiogVXNlZCB3aXRoIGNyZWF0ZVRhYkJhciB0byBhZGQgYnV0dG9ucyAqL1xuICAgICAgY3JlYXRlVGFiQnV0dG9uLFxuICAgICAgLyoqIEEgZ2VuZXJhbCBcInJlc3RhcnQgeW91ciBicm93c2VyXCIgbWVzc2FnZSAgKi9cbiAgICAgIGRlY2xhcmVSZXN0YXJ0UmVxdWlyZWQsXG4gICAgfVxuICB9XG59XG4iXX0=