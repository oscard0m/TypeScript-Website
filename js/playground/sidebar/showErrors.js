define(["require", "exports", "../localizeWithFallback"], function (require, exports, localizeWithFallback_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.showErrors = void 0;
    const showErrors = (i, utils) => {
        let container;
        let sandbox;
        let ds;
        let prevMarkers = [];
        const updateUI = () => {
            if (!sandbox)
                return;
            const model = sandbox.getModel();
            const markers = sandbox.monaco.editor.getModelMarkers({ resource: model.uri });
            // Bail early if there's nothing to show
            if (!markers.length) {
                prevMarkers = [];
                ds.showEmptyScreen((0, localizeWithFallback_1.localize)("play_sidebar_errors_no_errors", "No errors"));
                return;
            }
            // @ts-ignore
            const playground = window.playground;
            if (!playground)
                return;
            if (playground.getCurrentPlugin().id !== "errors")
                return;
            ds.clearDeltaDecorators(true);
            // The hover can trigger this, so avoid that loop
            const markerIDs = markers.filter(m => m.severity !== 1).map(m => m.startColumn + m.startLineNumber);
            if (markerIDs.length === prevMarkers.length && markerIDs.every((value, index) => value === prevMarkers[index]))
                return;
            prevMarkers = markerIDs;
            // Clean any potential empty screens
            ds.clear();
            ds.subtitle("Errors in code");
            ds.listDiags(model, markersToTSDiags(model, markers));
        };
        let changeDecoratorsDispose;
        const plugin = {
            id: "errors",
            displayName: i("play_sidebar_errors"),
            didMount: (_sandbox, _container) => {
                sandbox = _sandbox;
                container = _container;
                ds = utils.createDesignSystem(container);
                changeDecoratorsDispose = sandbox.getModel().onDidChangeDecorations(updateUI);
                prevMarkers = [];
                updateUI();
            },
            didUnmount: () => {
                if (changeDecoratorsDispose)
                    changeDecoratorsDispose.dispose();
                if (ds)
                    ds.clearDeltaDecorators(true);
            },
        };
        return plugin;
    };
    exports.showErrors = showErrors;
    const markersToTSDiags = (model, markers) => {
        return markers
            .map(m => {
            const start = model.getOffsetAt({ column: m.startColumn, lineNumber: m.startLineNumber });
            return {
                code: -1,
                category: markerToDiagSeverity(m.severity),
                file: undefined,
                start,
                length: model.getCharacterCountInRange(m),
                messageText: m.message,
            };
        })
            .sort((lhs, rhs) => lhs.category - rhs.category);
    };
    /*
    export enum MarkerSeverity {
        Hint = 1,
        Info = 2,
        Warning = 4,
        Error = 8
    }
    
    to
    
    export enum DiagnosticCategory {
        Warning = 0,
        Error = 1,
        Suggestion = 2,
        Message = 3
    }
      */
    const markerToDiagSeverity = (markerSev) => {
        switch (markerSev) {
            case 1:
                return 2;
            case 2:
                return 3;
            case 4:
                return 0;
            case 8:
                return 1;
            default:
                return 3;
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hvd0Vycm9ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BsYXlncm91bmQvc3JjL3NpZGViYXIvc2hvd0Vycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBS08sTUFBTSxVQUFVLEdBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3BELElBQUksU0FBc0IsQ0FBQTtRQUMxQixJQUFJLE9BQWdCLENBQUE7UUFDcEIsSUFBSSxFQUErQyxDQUFBO1FBQ25ELElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQTtRQUU5QixNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7WUFDcEIsSUFBSSxDQUFDLE9BQU87Z0JBQUUsT0FBTTtZQUNwQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDaEMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBRTlFLHdDQUF3QztZQUN4QyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDbkIsV0FBVyxHQUFHLEVBQUUsQ0FBQTtnQkFDaEIsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFBLEdBQUEsK0JBQVEsQ0FBQSxDQUFDLCtCQUErQixFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7Z0JBQzFFLE9BQU07YUFDUDtZQUVELGFBQWE7WUFDYixNQUFNLFVBQVUsR0FBZSxNQUFNLENBQUMsVUFBVSxDQUFBO1lBRWhELElBQUksQ0FBQyxVQUFVO2dCQUFFLE9BQU07WUFDdkIsSUFBSSxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEtBQUssUUFBUTtnQkFBRSxPQUFNO1lBRXpELEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUU3QixpREFBaUQ7WUFDakQsTUFBTSxT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VixLQUFLLENBQUM7Z0JBQ0osT0FBTyxDQUFDLENBQUE7WUFDVixLQUFLLENBQUM7Z0JBQ0osT0FBTyxDQUFDLENBQUE7WUFDVixLQUFLLENBQUM7Z0JBQ0osT0FBTyxDQUFDLENBQUE7WUFDVjtnQkFDRSxPQUFPLENBQUMsQ0FBQTtTQUNYO0lBQ0gsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBJRGlzcG9zYWJsZSB9IGZyb20gXCJtb25hY28tZWRpdG9yXCJcbmltcG9ydCB0eXBlIHsgU2FuZGJveCB9IGZyb20gXCJ0eXBlc2NyaXB0bGFuZy1vcmcvc3RhdGljL2pzL3NhbmRib3hcIlxuaW1wb3J0IHsgUGxheWdyb3VuZFBsdWdpbiwgUGx1Z2luRmFjdG9yeSwgUGxheWdyb3VuZCB9IGZyb20gXCIuLlwiXG5pbXBvcnQgeyBsb2NhbGl6ZSB9IGZyb20gXCIuLi9sb2NhbGl6ZVdpdGhGYWxsYmFja1wiXG5cbmV4cG9ydCBjb25zdCBzaG93RXJyb3JzOiBQbHVnaW5GYWN0b3J5ID0gKGksIHV0aWxzKSA9PiB7XG4gIGxldCBjb250YWluZXI6IEhUTUxFbGVtZW50XG4gIGxldCBzYW5kYm94OiBTYW5kYm94XG4gIGxldCBkczogUmV0dXJuVHlwZTx0eXBlb2YgdXRpbHMuY3JlYXRlRGVzaWduU3lzdGVtPlxuICBsZXQgcHJldk1hcmtlcnM6IG51bWJlcltdID0gW11cblxuICBjb25zdCB1cGRhdGVVSSA9ICgpID0+IHtcbiAgICBpZiAoIXNhbmRib3gpIHJldHVyblxuICAgIGNvbnN0IG1vZGVsID0gc2FuZGJveC5nZXRNb2RlbCgpXG4gICAgY29uc3QgbWFya2VycyA9IHNhbmRib3gubW9uYWNvLmVkaXRvci5nZXRNb2RlbE1hcmtlcnMoeyByZXNvdXJjZTogbW9kZWwudXJpIH0pXG5cbiAgICAvLyBCYWlsIGVhcmx5IGlmIHRoZXJlJ3Mgbm90aGluZyB0byBzaG93XG4gICAgaWYgKCFtYXJrZXJzLmxlbmd0aCkge1xuICAgICAgcHJldk1hcmtlcnMgPSBbXVxuICAgICAgZHMuc2hvd0VtcHR5U2NyZWVuKGxvY2FsaXplKFwicGxheV9zaWRlYmFyX2Vycm9yc19ub19lcnJvcnNcIiwgXCJObyBlcnJvcnNcIikpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBAdHMtaWdub3JlXG4gICAgY29uc3QgcGxheWdyb3VuZDogUGxheWdyb3VuZCA9IHdpbmRvdy5wbGF5Z3JvdW5kXG5cbiAgICBpZiAoIXBsYXlncm91bmQpIHJldHVyblxuICAgIGlmIChwbGF5Z3JvdW5kLmdldEN1cnJlbnRQbHVnaW4oKS5pZCAhPT0gXCJlcnJvcnNcIikgcmV0dXJuXG5cbiAgICBkcy5jbGVhckRlbHRhRGVjb3JhdG9ycyh0cnVlKVxuXG4gICAgLy8gVGhlIGhvdmVyIGNhbiB0cmlnZ2VyIHRoaXMsIHNvIGF2b2lkIHRoYXQgbG9vcFxuICAgIGNvbnN0IG1hcmtlcklEcyA9IG1hcmtlcnMuZmlsdGVyKG0gPT4gbS5zZXZlcml0eSAhPT0gMSkubWFwKG0gPT4gbS5zdGFydENvbHVtbiArIG0uc3RhcnRMaW5lTnVtYmVyKVxuICAgIGlmIChtYXJrZXJJRHMubGVuZ3RoID09PSBwcmV2TWFya2Vycy5sZW5ndGggJiYgbWFya2VySURzLmV2ZXJ5KCh2YWx1ZSwgaW5kZXgpID0+IHZhbHVlID09PSBwcmV2TWFya2Vyc1tpbmRleF0pKSByZXR1cm5cbiAgICBwcmV2TWFya2VycyA9IG1hcmtlcklEc1xuXG4gICAgLy8gQ2xlYW4gYW55IHBvdGVudGlhbCBlbXB0eSBzY3JlZW5zXG4gICAgZHMuY2xlYXIoKVxuICAgIGRzLnN1YnRpdGxlKFwiRXJyb3JzIGluIGNvZGVcIilcbiAgICBkcy5saXN0RGlhZ3MobW9kZWwsIG1hcmtlcnNUb1RTRGlhZ3MobW9kZWwsIG1hcmtlcnMpKVxuICB9XG5cbiAgbGV0IGNoYW5nZURlY29yYXRvcnNEaXNwb3NlOiBJRGlzcG9zYWJsZSB8IHVuZGVmaW5lZFxuXG4gIGNvbnN0IHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbiA9IHtcbiAgICBpZDogXCJlcnJvcnNcIixcbiAgICBkaXNwbGF5TmFtZTogaShcInBsYXlfc2lkZWJhcl9lcnJvcnNcIiksXG4gICAgZGlkTW91bnQ6IChfc2FuZGJveCwgX2NvbnRhaW5lcikgPT4ge1xuICAgICAgc2FuZGJveCA9IF9zYW5kYm94XG4gICAgICBjb250YWluZXIgPSBfY29udGFpbmVyXG4gICAgICBkcyA9IHV0aWxzLmNyZWF0ZURlc2lnblN5c3RlbShjb250YWluZXIpXG4gICAgICBjaGFuZ2VEZWNvcmF0b3JzRGlzcG9zZSA9IHNhbmRib3guZ2V0TW9kZWwoKS5vbkRpZENoYW5nZURlY29yYXRpb25zKHVwZGF0ZVVJKVxuICAgICAgcHJldk1hcmtlcnMgPSBbXVxuICAgICAgdXBkYXRlVUkoKVxuICAgIH0sXG4gICAgZGlkVW5tb3VudDogKCkgPT4ge1xuICAgICAgaWYgKGNoYW5nZURlY29yYXRvcnNEaXNwb3NlKSBjaGFuZ2VEZWNvcmF0b3JzRGlzcG9zZS5kaXNwb3NlKClcbiAgICAgIGlmIChkcykgZHMuY2xlYXJEZWx0YURlY29yYXRvcnModHJ1ZSlcbiAgICB9LFxuICB9XG4gIHJldHVybiBwbHVnaW5cbn1cblxuY29uc3QgbWFya2Vyc1RvVFNEaWFncyA9IChcbiAgbW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklNb2RlbCxcbiAgbWFya2VyczogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSU1hcmtlcltdXG4pOiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpLkRpYWdub3N0aWNSZWxhdGVkSW5mb3JtYXRpb25bXSA9PiB7XG4gIHJldHVybiBtYXJrZXJzXG4gICAgLm1hcChtID0+IHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gbW9kZWwuZ2V0T2Zmc2V0QXQoeyBjb2x1bW46IG0uc3RhcnRDb2x1bW4sIGxpbmVOdW1iZXI6IG0uc3RhcnRMaW5lTnVtYmVyIH0pXG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb2RlOiAtMSxcbiAgICAgICAgY2F0ZWdvcnk6IG1hcmtlclRvRGlhZ1NldmVyaXR5KG0uc2V2ZXJpdHkpLFxuICAgICAgICBmaWxlOiB1bmRlZmluZWQsXG4gICAgICAgIHN0YXJ0LFxuICAgICAgICBsZW5ndGg6IG1vZGVsLmdldENoYXJhY3RlckNvdW50SW5SYW5nZShtKSxcbiAgICAgICAgbWVzc2FnZVRleHQ6IG0ubWVzc2FnZSxcbiAgICAgIH1cbiAgICB9KVxuICAgIC5zb3J0KChsaHMsIHJocykgPT4gbGhzLmNhdGVnb3J5IC0gcmhzLmNhdGVnb3J5KVxufVxuXG4vKlxuZXhwb3J0IGVudW0gTWFya2VyU2V2ZXJpdHkge1xuICAgIEhpbnQgPSAxLFxuICAgIEluZm8gPSAyLFxuICAgIFdhcm5pbmcgPSA0LFxuICAgIEVycm9yID0gOFxufVxuXG50byBcblxuZXhwb3J0IGVudW0gRGlhZ25vc3RpY0NhdGVnb3J5IHtcbiAgICBXYXJuaW5nID0gMCxcbiAgICBFcnJvciA9IDEsXG4gICAgU3VnZ2VzdGlvbiA9IDIsXG4gICAgTWVzc2FnZSA9IDNcbn1cbiAgKi9cbmNvbnN0IG1hcmtlclRvRGlhZ1NldmVyaXR5ID0gKG1hcmtlclNldjogbnVtYmVyKSA9PiB7XG4gIHN3aXRjaCAobWFya2VyU2V2KSB7XG4gICAgY2FzZSAxOlxuICAgICAgcmV0dXJuIDJcbiAgICBjYXNlIDI6XG4gICAgICByZXR1cm4gM1xuICAgIGNhc2UgNDpcbiAgICAgIHJldHVybiAwXG4gICAgY2FzZSA4OlxuICAgICAgcmV0dXJuIDFcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIDNcbiAgfVxufVxuIl19