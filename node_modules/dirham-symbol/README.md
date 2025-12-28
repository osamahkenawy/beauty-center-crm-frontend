# UAE Dirham Symbol (AED)

![UAE Dirham Symbol](UAE_Dirham_Symbol.svg)

A React component that provides the new UAE Dirham (AED) symbol using a custom font. This package makes it easy to display the official Dirham symbol in your React applications with full customization support.

## Features

- ✅ Official UAE Dirham symbol using custom font
- ✅ React component with TypeScript support
- ✅ Multiple font formats (WOFF2, WOFF, TTF)
- ✅ Fully customizable via CSS or inline styles
- ✅ Lightweight and tree-shakeable
- ✅ Compatible with React 17+

## Installation

```bash
npm install dirham-symbol
```

```bash
yarn add dirham-symbol
```

## Usage

### Import CSS Styles

You need to import the CSS file to load the custom font. Add this import to your main CSS file or at the top of your application:

```css
@import "dirham-symbol/dist/index.css";
```

Or import it in your JavaScript/TypeScript entry file:

```js
import "dirham-symbol/dist/index.css";
```

### Basic Usage

```jsx
import { DirhamSymbol } from "dirham-symbol";

function App() {
  return (
    <div>
      <DirhamSymbol>100</DirhamSymbol>
    </div>
  );
}
```

### Custom Styling

```jsx
import { DirhamSymbol } from "dirham-symbol";

function App() {
  return (
    <div>
      <DirhamSymbol style={{ fontSize: "24px", color: "#gold" }}>1,500</DirhamSymbol>
    </div>
  );
}
```

### CSS Classes

The component includes default CSS classes that you can override:

```css
.dirham-symbol {
  font-size: 1.2em;
  color: #green;
}

.dirham-container {
  gap: 0.5rem;
}
```

## Technical Details

- **Unicode Character**: (U+E000)
- **HTML entity (decimal)**: &#57344;
- **HTML entity (hexadecimal)**: &#xE000;
- **Font Family**: UAESymbol
- **Supported Formats**: WOFF2, WOFF, TTF
- **Bundle Size**: ~15KB (including fonts)

## Browser Support

- Chrome 36+
- Firefox 39+
- Safari 12+
- Edge 79+

## API Reference

### DirhamSymbol

```tsx
interface DirhamSymbolProps extends React.PropsWithChildren {
  style?: React.CSSProperties;
  className?: string;
  // ... other HTML span attributes
}
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Development mode
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC License - see LICENSE file for details.

## Author

Prasath Mani

---

Made with ❤️ for the UAE developer community
