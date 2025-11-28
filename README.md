![NPM Version](https://img.shields.io/npm/v/%40netizen-ais%2Fxprejson?logo=npm&color=white)

# `<x-pre-json>` JSON viewer/editor Custom HTML Element

`<x-pre-json>` is an HTML custom element that allows you to render JSON objects in HTML documents with human-readable formatting and expandable interaction for browsing deep JSON structures, edit values and sort arrays.

It uses only plain HTML/CSS/Js and has no dependencies.

It's based on [`mohsen1's pretty-json`](https://github.com/mohsen1/pretty-json) custom viewer element.
## Installation

```bash
npm install @netizen-ais/xprejson
```

## Usage

### CDN

```html
<script type="module" src="https://unpkg.com/@netizen-ais/xprejson/xprejson.min.js"></script>
```

### NPM

```javascript
import '@netizen-ais/xprejson';
```

### Example

<!-- prettier-ignore-start -->
```html
<x-pre-json>
{
  "hello": "world",
  "value": 42,
  "enabled": true,
  "extra": null,
  "nested": { "key": "value", "array": [0, 1 ,2 ,"a"] }
}
</x-pre-json>
````
<!-- prettier-ignore-end -->

Your JSON will be rendered as a human-readable format:

<picture>
  <source srcset="https://github.com/netizen-ais/xprejson/raw/main/screenshot.png" />
  <img src="https://github.com/netizen-ais/xprejson/raw/main/screenshot.png" alt="Screenshot" width="200px" />
</picture>

## Features

- HTML Custom Element without any dependencies, works in any modern browser
- No need to install any dependencies or build tools, just drop the script in your HTML and start using it
- Display large JSON objects with expandable and collapsible sections
- Supports truncating very large strings and arrays with an ellipsis
- Allows some customization using CSS variables
- All JSON intrinsic formating symbols (quotes, colon, comma) are delegated to HTML pseudo elements ::before/after and CSS managed
- Show element count on arrays if requested
- Edit values and sort array elements
- Updates textContent property and emits an `InputEvent` when edited

## To-do List

- [X] Edit boolean values
- [X] Hide (index) keys for array of objects
- [ ] Add/Delete keys

## Attributes

You can customize the rendering of the JSON object by setting the following attributes on the `<x-pre-json>` element:

### `array-size`

Show element count on arrays

```html
<x-pre-json array-size>{a: [0, 1, 2, "foo"]}</x-pre-json>
```

### `editable`

By default, the JSON object is only a viewer, set the `editable` attribute (to "" or "true") to allow modification:

```html
<x-pre-json editable>{"hello": {"world": "!"}}</x-pre-json>
```

### `expand`

By default, the JSON object is rendered expanded up to 1 level deep (expand="1"). You can set the `expand` attribute to a number to expand the JSON object up to that level deep:

```html
<x-pre-json expand="2">{"hello": {"world": "!"}}</x-pre-json>
```

#### Collapsed by default

You can set the `expand` attribute to `0` to render the JSON object collapsed by default:

```html
<x-pre-json expand="0">{"hello": {"world": "!"}}</x-pre-json>
```

### `truncate-string`

By default, strings longer than 500 characters are truncated with an ellipsis. You can set the `truncate-string` attribute to a number to truncate strings longer than that number of characters:

```html
<x-pre-json truncate-string="10">
  {"hello": "long string that will be truncated"}
</x-pre-json>
```

## Customization

You can customize the appearance of the rendered JSON using CSS variables:

```css
x-pre-json {
  --symbol-color: #737373;
  --string-color: #009900;
  --number-color: #0000ff;
  --null-color: #666666;
  --boolean-color: #d23c91;
  --indent: 2rem;
  --font-family: monospace;
  --font-size: 1rem;
}

/* Also handle the dark mode */
@media (prefers-color-scheme: dark) {
  x-pre-json {
    --symbol-color: #6c6c6c;
    --string-color: #21c521;
    --number-color: #0078b3;
    --null-color: #8c8888;
    --boolean-color: #c737b3;
    --indent: 2rem;
    --font-family: monospace;
    --font-size: 1rem;
  }
}
```
