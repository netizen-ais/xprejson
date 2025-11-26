// @ts-check
/**
 * @typedef {string | number | null | undefined | bigint | boolean | symbol} Primitive
 * @typedef {(...args: any[]) => any} AnyFunction
 */

/**
 * Error class for x-pre-json specific errors.
 */
class xPreJSONError extends Error {
    /**
     * Create a new xPreJSONError.
     * @param {string} message - Error message.
     */
    constructor(message) {
        super(message);
        this.name = "xPreJSONError";
    }
}

/**
 * Web component that renders JSON as a collapsible, readable representation.
 *
 * @class xPreJSON
 * @extends {HTMLElement}
 */
class xPreJSON extends HTMLElement {
    /**
     * The parsed input value for this element.
     * Populated from the element's textContent on connectedCallback.
     * @type {any}
     */
    input;

    /**
     * Whether this node is currently expanded (true) or collapsed (false).
     * @type {boolean}
     */
    isExpanded = true;

    /**
     * Show array size when collapsed.
     * @type {boolean}
     */
    arrSize = false;

    /**
     * Whether fields are editable by user interaction.
     * @type {boolean}
     */
    editable = false;

    /**
     * Attributes observed by the element.
     * @returns {string[]}
     */
    static get observedAttributes() {
        return ["expand", "key", "truncate-string", "modified", "editable", "array-size"];
    }

    /**
     * Default CSS variable values for light and dark themes.
     * @type {{ light: Record<string,string>, dark: Record<string,string> }}
     */
    static DEFAULT_VARIABLES = {
        light: {
            keyColor: "#cc0000",
            symbolColor: "#737373",
            stringColor: "#009900",
            numberColor: "#0000ff",
            nullColor: "#666666",
            booleanColor: "#d23c91",
            indent: "2rem",
            fontSize: "1rem",
            fontFamily: "monospace",
        },
        dark: {
            keyColor: "#2487e9ff",
            symbolColor: "#6c6c6c",
            stringColor: "#15d37eff",
            numberColor: "#ffb310ff",
            nullColor: "#8c8888",
            booleanColor: "#ffffffff",
            indent: "2rem",
            fontSize: "1rem",
            fontFamily: "monospace",
        },
    };

    /**
     * Compute CSS variable values taking into account prefers-color-scheme and host CSS variables.
     * @returns {Record<string,string>} CSS variables to use in styles.
     */
    getCssVariables() {
        const prefersDarkMode = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
        const variables = prefersDarkMode
            ? xPreJSON.DEFAULT_VARIABLES.dark
            : xPreJSON.DEFAULT_VARIABLES.light;
        if (!this.shadowRoot) {
            return variables;
        }
        const style = getComputedStyle(this.shadowRoot.host);

        return {
            keyColor: style.getPropertyValue("--key-color") || variables.keyColor,
            symbolColor: style.getPropertyValue("--symbol-color") || variables.symbolColor,
            stringColor: style.getPropertyValue("--string-color") || variables.stringColor,
            numberColor: style.getPropertyValue("--number-color") || variables.numberColor,
            nullColor: style.getPropertyValue("--null-color") || variables.nullColor,
            booleanColor: style.getPropertyValue("--boolean-color") || variables.booleanColor,
            indent: style.getPropertyValue("--indent") || variables.indent,
            fontSize: style.getPropertyValue("--font-size") || variables.fontSize,
            fontFamily: style.getPropertyValue("--font-family") || variables.fontFamily,
        };
    }

    /**
     * CSS styles string built from computed variables.
     * @returns {string}
     */
    get styles() {
        const variables = this.getCssVariables();
        return `/* css */
:host {
	--key-color: ${variables.keyColor};
	--symbol-color: ${variables.symbolColor};
	--string-color: ${variables.stringColor};
	--number-color: ${variables.numberColor};
	--null-color: ${variables.nullColor};
	--boolean-color: ${variables.booleanColor};
	--indent: ${variables.indent};
	--font-size: ${variables.fontSize};
	--font-family: ${variables.fontFamily};
}
button {
	border: none;
	background: transparent;
	cursor: pointer;
	font-family: inherit;
	font-size: var(--font-size);
	vertical-align: text-bottom;
}
.container {
	font-family: var(--font-family);
	font-size: var(--font-size);
}

*::before,
*::after,
data[count] {
	color: var(--symbol-color);
}
:host(:not([key]))>.container.object::before {
	content: "{";
}
:host(:not([key]))>.container.array::before {
	content: "[";
}
.container.object::after {
	content: "}";
}
:host(.comma) .container.object::after {
	content: "},";
}
.container.array::after {
	content: "]";
}
:host(.comma) .container.array::after {
	content: "],";
}
.key {
	color: var(--key-color);
	margin-right: 0.5rem;
	padding: 0;
	margin: 0;

	&::after {
		content: ": ";
	}
	.object>&::after {
		content: ": {";
	}
	.array>&::after {
		content: ": " attr(count) " [";
	}
}
data[count] {
	font-size: xx-small;
	font-style: italic;

	&::before {
		content: attr(count);
	}
}
.key .arrow {
	width: 1rem;
	height: 0.75rem;
	margin-left: -1.25rem;
	padding-right: 0.25rem;
	vertical-align: baseline;
}
.arrow .triangle {
	fill: var(--symbol-color);
}
:is(.value.string, .key-name) {
	&::before{
		content: '"';
	}
	&::after{
		content: '"';
	}
}
.row:has(+ :is([expand][key], .row))::after {
	content: ",";
}
.empty.array {
	margin-inline-start: .5rem;

	&::before {
		content: "[]";
	}
}
.string,
.url {
	color: var(--string-color);
}
.number,
.bigint {
	color: var(--number-color);
}
.null {
	color: var(--null-color);
}
.boolean {
	color: var(--boolean-color);
}
.ellipsis {
	width: 1rem;
	padding: 0;
	&::after {
		content: "…";
	}
}
.triangle {
	fill: black;
	stroke: black;
	stroke-width: 0;
}
.row {
	padding-left: var(--indent);

	.dragged {
		opacity: 0.9;
	}

	& .row {
		display: table;
	}

	& *:not(x-pre-json) {
		display: contents;
	}
}
  `;
    }

    /**
     * Construct the element and attach shadow root.
     */
    constructor() {
        super();

        this.attachShadow({ mode: "open" });
    }

    /**
     * Current numeric expand attribute value.
     * Follows semantics: missing => 1, invalid or negative => 0.
     * @returns {number}
     */
    get expandAttributeValue() {
        const expandAttribute = this.getAttribute("expand");
        if (expandAttribute === null) {
            return 1;
        }
        const expandValue = Number.parseInt(expandAttribute);
        return isNaN(expandValue) || expandValue < 0 ? 0 : expandValue;
    }

    /**
     * Current truncate-string attribute value (number of characters).
     * Defaults to 500 when not set.
     * @returns {number}
     */
    get truncateStringAttributeValue() {
        const DEFAULT_TRUNCATE_STRING = 500;
        const truncateStringAttribute = this.getAttribute("truncate-string");
        if (truncateStringAttribute === null) {
            return DEFAULT_TRUNCATE_STRING;
        }
        const truncateStringValue = Number.parseInt(truncateStringAttribute);
        return isNaN(truncateStringValue) || truncateStringValue < 0
            ? 0
            : truncateStringValue;
    }

    /**
     * Toggle expanded/collapsed state and re-render.
     * Updates the expand attribute to reflect new state.
     * @returns {void}
     */
    toggle() {
        this.isExpanded = !this.isExpanded;
        this.setAttribute(
            "expand",
            this.isExpanded ? String(this.expandAttributeValue + 1) : "0",
        );
        this.render();
    }

    /**
     * Create a child element representing input (primitive or object/array).
     * @param {Record<any, any> | any[] | Primitive | AnyFunction} input - Value to render.
     * @param {number} expand - Remaining expand depth.
     * @param {string} [key] - Optional property key for this child.
     * @returns {HTMLElement} Rendered child element.
     */
    createChild(input, expand, key) {
        if (this.isPrimitiveValue(input)) {
            const container = this.createContainer();
            container.appendChild(this.createPrimitiveValueElement(input, key));
            return container;
        }
        return this.createObjectOrArray(input);
    }

    /**
     * Determine whether value is a primitive (including null).
     * @param {any} input
     * @returns {boolean} True if primitive.
     */
    isPrimitiveValue(input) {
        return typeof input !== "object" || input === null;
    }

    /**
     * Determine if the current input string is a valid URL.
     * Uses the global URL constructor.
     * @returns {boolean}
     */
    isValidStringURL() {
        try {
            new URL(this.input);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create an element representing a primitive value.
     * Adds editing handlers when this.editable is true.
     * @param {Primitive} input - Primitive value to render.
     * @param {string} [key] - Optional key for this value.
     * @returns {HTMLElement} Element containing the primitive representation.
     */
    createPrimitiveValueElement(input, key) {
        const container = document.createElement("div");
        const type = typeof input === "object" ? "null" : typeof input;
        container.className = `primitive value ${type}`;
        container.setAttribute("key", key ?? "");
        if (type === "string") {
            if (this.isValidStringURL()) {
                const anchor = document.createElement("a");
                anchor.className = "url";
                anchor.href = this.input;
                anchor.target = "_blank";
                anchor.textContent = input;
                container.append('"', anchor, '"');
            } else if (input.length > this.truncateStringAttributeValue) {
                container.appendChild(this.createTruncatedStringElement(input));
            } else {
                container.textContent = input;
            }
        } else {
            container.textContent = JSON.stringify(input);
        }
        if (this.editable) container.addEventListener("click", (event) => {
            event.stopPropagation();
            const
                key = container.getAttribute("key"),
                host = container.getRootNode().host;
            // make editable
            // save original displayed text so Escape can revert
            const originalText = container.textContent ?? "";
            container.setAttribute("contenteditable", "");
            // handle live edits
            const onInput = (ev) => {
                const newText = container.textContent ?? "";
                // preserve string semantics: if original was string, keep as string;
                // otherwise try to parse JSON to keep types (number, boolean, null, etc.)
                let parsed;
                if (type === "string") {
                    parsed = newText;
                } else {
                    try {
                        parsed = JSON.parse(newText);
                    } catch {
                        parsed = newText;
                    }
                }
                // update host.input and propagate up via handleChildUpdate when available
                if (host && typeof host.handleChildUpdate === "function" && key) {
                    host.handleChildUpdate(key, parsed);
                } else if (host) {
                    // fallback: update host textContent directly
                    host.input = host.input ?? {};
                    host.input[key] = parsed;
                    host.textContent = JSON.stringify(host.input);
                    host.setAttribute("modified", key);
                }
            };
            container.addEventListener("input", onInput);
            // handle Enter / Escape keys to end or cancel edit and don't propagate
            const onKeyDown = (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    // finish editing (commit already applied via input events)
                    container.removeAttribute("contenteditable");
                    container.removeEventListener("input", onInput);
                    container.removeEventListener("keydown", onKeyDown);
                    window.removeEventListener("click", onWindowClick);
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    // revert to original value
                    container.textContent = originalText;
                    // update host with reverted value
                    let reverted;
                    if (type === "string") {
                        reverted = originalText;
                    } else {
                        try {
                            reverted = JSON.parse(originalText);
                        } catch {
                            reverted = originalText;
                        }
                    }
                    if (host && typeof host.handleChildUpdate === "function" && key) {
                        host.handleChildUpdate(key, reverted);
                    } else if (host) {
                        host.input = host.input ?? {};
                        host.input[key] = reverted;
                        host.textContent = JSON.stringify(host.input);
                        host.setAttribute("modified", key);
                    }
                    container.removeAttribute("contenteditable");
                    container.removeEventListener("input", onInput);
                    container.removeEventListener("keydown", onKeyDown);
                    window.removeEventListener("click", onWindowClick);
                } else {
                    // any key while editing shouldn't propagate to ancestors
                    e.stopPropagation();
                }
            };
            container.addEventListener("keydown", onKeyDown);
            // remove contenteditable on outside clicks
            const onWindowClick = (evt) => {
                if (!container.contains(evt.target)) {
                    container.removeAttribute("contenteditable");
                    container.removeEventListener("input", onInput);
                    container.removeEventListener("keydown", onKeyDown);
                    window.removeEventListener("click", onWindowClick);
                }
            };
            window.addEventListener("click", onWindowClick);
        });
        return container;
    }

    /**
     * Create a truncated string element with a button to expand more text.
     * @param {string} input - Full string value to truncate.
     * @returns {HTMLElement} Element containing truncated portion and expand control.
     */
    createTruncatedStringElement(input) {
        const container = document.createElement("div");
        container.dataset.expandedTimes = "1";
        container.className = "truncated string";
        const ellipsis = document.createElement("button");
        ellipsis.className = "ellipsis";

        ellipsis.addEventListener("click", () => {
			ellipsis.remove();
			container.childNodes[0].textContent = input;
        }, {once: true});

        container.append(
            input.slice(0, this.truncateStringAttributeValue),
            ellipsis,
        );
        return container;
    }

    /**
     * Create a container element used to group rows/values.
     * @returns {HTMLElement}
     */
    createContainer() {
        const container = document.createElement("div");
        container.className = "container";
        return container;
    }

    /**
     * Create DOM structure for an object or array value.
     * Recurses by creating nested x-pre-json elements for non-primitives.
     * @param {Record<any, any> | any[]} object - Object or array to render.
     * @returns {HTMLElement}
     */
    createObjectOrArray(object) {
        const isArray = Array.isArray(object);
        const objectKeyName = this.getAttribute("key");
        const expand = this.expandAttributeValue;
        const truncateString = this.truncateStringAttributeValue; // Get the truncate string attribute value

        const container = this.createContainer();
        container.classList.add(isArray ? "array" : "object");

        if (objectKeyName) {
            // if objectKeyName is provided, then it is a row
            container.classList.add("row");
            const keyElement = this.createKeyElement(objectKeyName, {
                withArrow: true,
                expanded: this.isExpanded,
            });
            keyElement.addEventListener("click", this.toggle.bind(this));
            container.appendChild(keyElement);
			if (isArray && this.arrSize) {
				const countElement = document.createElement("data");
				countElement.setAttribute("count", object.length);
				container.appendChild(countElement);
			}
        }

        if (isArray && (object.length === 0))
            container.classList.add("empty");

        if (!this.isExpanded) {
            const ellipsis = document.createElement("button");
            ellipsis.className = "ellipsis";
            container.appendChild(ellipsis);
            ellipsis.addEventListener("click", this.toggle.bind(this));
            return container;
        }

        Object.entries(object).forEach(([key, value], index) => {
            const self = this;
            // for primitives we make a row here
            if (
                this.isPrimitiveValue(value) ||
                (Array.isArray(value) && value.length === 0)
            ) {
                const
                    rowContainer = document.createElement("div");
                if (!isArray) {
                    const keyElement = this.createKeyElement(key);
                    rowContainer.appendChild(keyElement);
                }
                rowContainer.className = "row";
                if (Array.isArray(value)) {
                    const emptyArrayElement = document.createElement("span");
                    emptyArrayElement.className = "empty array";
                    rowContainer.appendChild(emptyArrayElement);
                } else {
                    rowContainer.appendChild(this.createPrimitiveValueElement(value, key));
                    if (isArray && self.editable) {
						const
							dragStart = (e) => {
								// use the row element (currentTarget) as the dragged element
								container.selected = e.currentTarget;
								e.dataTransfer.setData("text/plain", "");
								e.dataTransfer.setDragImage(new Image(0, 0), 0, 0);
								// e.dataTransfer.effectAllowed = "all";
								e.dataTransfer.dropEffect = "move";
								e.currentTarget.classList.add("dragged");
							},
							dragOver = (e) => {
								if (container.contains(e.target)) e.preventDefault();
								const targetRow = e.currentTarget;
								const dragged = container.selected;
								if (!dragged || dragged === targetRow) return;
								if (!container.contains(e.currentTarget)) return;
								// insert dragged before targetRow when targetRow is before dragged;
								// otherwise insert after targetRow
								if (isBefore(dragged, targetRow)) {
									container.insertBefore(dragged, targetRow);
								} else {
									container.insertBefore(dragged, targetRow.nextSibling);
								}
							},
							dargLeave = (e) => {
								if (container.contains(e.currentTarget))
									e.preventDefault();
							},
							dragEnd = () => {
								container.selected?.classList.remove("dragged");
								container.selected = null;
								// build new array value from direct .row children
								const rows = Array.from(container.querySelectorAll(":scope > .row"));
								const newArr = rows.map((r) => {
									// prefer nested x-pre-json value if present
									const nested = r.querySelector("x-pre-json");
									if (nested) {
										try {
											return JSON.parse(nested.textContent ?? "null");
										} catch {
											return nested.textContent ?? null;
										}
									}
									// otherwise try to parse primitive text content
									const txt = (r.textContent ?? "").trim();
									try {
										return JSON.parse(txt);
									} catch {
										return txt;
									}
								});
								// update this x-pre-json's input/textContent and re-render
								self.input = newArr;
								self.textContent = JSON.stringify(newArr);
								if (typeof self.render === "function") self.render();
								// bubble change up to parent if present
								const myKey = self.getAttribute("key");
								const parentHost = self.getRootNode().host;
								if (parentHost && parentHost instanceof xPreJSON && myKey) {
									parentHost.handleChildUpdate(myKey, self.input);
								}
							},
							isBefore = (el1, el2) => {
								if (!el1 || !el2 || el1.parentNode !== el2.parentNode) return false;
								let cur = el1.previousSibling;
								for (; cur; cur = cur.previousSibling) {
									if (cur === el2) return true;
								}
								return false;
							};
                        rowContainer.setAttribute("draggable", "true");
                        rowContainer.addEventListener("dragstart", dragStart);
                        rowContainer.addEventListener("dragover", dragOver);
                        rowContainer.addEventListener("dragend", dragEnd);
                    }
                }
                container.appendChild(rowContainer);
                return;
            }

            // for objects and arrays we make a "container row"
            const xPreJSONElement = document.createElement("x-pre-json");
            xPreJSONElement.textContent = JSON.stringify(value);
            xPreJSONElement.setAttribute("expand", String(expand - 1));
            xPreJSONElement.setAttribute("truncate-string", String(truncateString)); // Set the truncate-string attribute
            xPreJSONElement.setAttribute("key", key);
            xPreJSONElement.setAttribute("editable", self.editable ? "" : "false");
            xPreJSONElement.setAttribute("array-size", self.arrSize ? "" : "false");
            xPreJSONElement.classList.toggle(
                "comma",
                index < Object.keys(object).length - 1,
            );
            container.appendChild(xPreJSONElement);
        });

        // container.appendChild(closingBrace);
        return container;
    }

    /**
     * Create an SVG arrow element used for expand/collapse affordance.
     * @param {{ expanded?: boolean }} [options] - Options controlling arrow orientation.
     * @returns {SVGElement}
     */
    createArrowElement({ expanded = false } = {}) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100");
        svg.setAttribute("height", "100");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("class", "arrow");
        const polygon = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon",
        );

        polygon.setAttribute("class", "triangle");
        polygon.setAttribute("points", "0,0 100,50 0,100");

        if (expanded) {
            polygon.setAttribute("transform", "rotate(90 50 50)");
        }

        svg.appendChild(polygon);

        return svg;
    }

    /**
     * Create a key element for object properties.
     * @param {string} key - Property name to display.
     * @param {{ withArrow?: boolean, expanded?: boolean }} [options] - Optional flags.
     * @returns {HTMLElement} Button or span element representing the key.
     */
    createKeyElement(key, { withArrow = false, expanded = false } = {}) {
        const keyElement = document.createElement(withArrow ? "button" : "span");
        keyElement.className = "key";
        keyElement.setAttribute("name", key);
        if (withArrow) {
            const arrow = this.createArrowElement({ expanded });
            keyElement.appendChild(arrow);
        }
        const keyName = document.createElement("span");
        keyName.className = "key-name";
        keyName.textContent = key;
        keyElement.appendChild(keyName);
        return keyElement;
    }

    /**
     * Called by child x-pre-json elements to notify this instance of updates.
     * Updates this.input/textContent and propagates the change to parent host or dispatches an input event.
     * @param {string} key - The property key that changed.
     * @param {any} value - New value for that property.
     * @returns {void}
     */
    handleChildUpdate(key, value) {
        this.input = this.input ?? {};
        this.input[key] = value;
        this.textContent = JSON.stringify(this.input);
        // propagate upwards to parent x-pre-json if present
        const parentHost = this.getRootNode().host;
        const myKey = this.getAttribute("key");
        if (parentHost && parentHost instanceof xPreJSON && myKey) {
            // parentHost expects the child's key (myKey) and the child's full value
            parentHost.handleChildUpdate(myKey, this.input);
        } else {
            // notify any listeners that this x-pre-json changed
            this.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }

    /**
     * Render the element into its shadow DOM.
     * Replaces shadowRoot contents with constructed DOM and styles.
     * @returns {void}
     * @throws {xPreJSONError} If shadow root is not available.
     */
    render() {
        if (!this.shadowRoot) {
            throw new xPreJSONError("Shadow root not available");
        }
        this.shadowRoot.innerHTML = "";
        this.shadowRoot.appendChild(
            this.createChild(this.input, this.expandAttributeValue),
        );

        if (this.shadowRoot.querySelector("[data-x-pre-json]")) {
            return;
        }

        const styles = document.createElement("style");
        styles.setAttribute("data-x-pre-json", "");
        styles.textContent = this.styles;
        this.shadowRoot.appendChild(styles);
    }

    /**
     * React to attribute changes.
     * Handles expand, truncate-string, editable and modified semantics.
     * @param {string} name - Attribute name changed.
     * @param {string} _oldValue - Previous value (unused).
     * @param {string|null} newValue - New value.
     * @returns {void}
     */
    attributeChangedCallback(name, _oldValue, newValue) {
        switch (name) {
            case "editable":
				this.editable = !!this.hasAttribute("editable");
                this.render();
                break;
            case "array-size":
				this.arrSize = !!this.hasAttribute("array-size");
                this.render();
                break;
            case "truncate-string":
                this.render();
                break;
            case "expand":
                if (newValue === null) {
                    this.isExpanded = false;
                } else {
                    const expandValue = Number.parseInt(newValue);
                    this.isExpanded = !isNaN(expandValue) && expandValue > 0;
                }
                this.render();
                break;
            case "modified":
                const
                    modified = this.shadowRoot.querySelector('[modified]'),
                    key = modified && modified.getAttribute("key"),
                    value = key && modified instanceof xPreJSON
                        ? JSON.parse(modified.textContent ?? "null")
                        : modified?.textContent ?? "null" ;
                if (key && value) {
                    this.removeAttribute("modified");
                    this.input[key] = value;
                    this.textContent = JSON.stringify(this.input);
                }
                break;
            default:
                break;
        }
    }

    /**
     * Lifecycle callback when element is connected to the document.
     * Parses current textContent as JSON and initializes state.
     * @returns {void}
     * @throws {xPreJSONError} If textContent is not valid JSON.
     */
    connectedCallback() {
        try {
            this.input = JSON.parse(this.textContent ?? "");
        } catch (jsonParseError) {
            const message = `Error parsing JSON: ${
                jsonParseError instanceof Error
                    ? jsonParseError.message
                    : "Unknown error"
            }`;
            throw new xPreJSONError(message);
        }
        this.editable = !!this.hasAttribute("editable");
        this.render();
    }
}

// Define x-pre-json custom element
customElements.define("x-pre-json", xPreJSON);
