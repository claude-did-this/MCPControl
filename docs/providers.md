# MCPControl Automation Providers

MCPControl supports multiple automation providers to give users flexibility in how they control their systems. Each provider has its own strengths and may work better in different environments.

## Available Providers

### NutJS Provider (Default)

The NutJS provider uses the [nut.js](https://github.com/nut-tree/nut.js) library for system automation. It's the default provider and offers comprehensive support for keyboard, mouse, screen, and clipboard operations.

### Keysender Provider

The Keysender provider uses the [keysender](https://github.com/garrettlynch/keysender) library for system automation. It provides an alternative implementation that may work better in some environments.

**Note**: The Keysender provider has some limitations in screen operations compared to the NutJS provider.

## Selecting a Provider

You can select which provider to use by setting the `AUTOMATION_PROVIDER` environment variable:

```bash
# Use the NutJS provider (default)
AUTOMATION_PROVIDER=nutjs node build/index.js

# Use the Keysender provider
AUTOMATION_PROVIDER=keysender node build/index.js
```

## Provider Comparison

| Feature | NutJS | Keysender |
|---------|-------|-----------|
| Keyboard | Full support | Full support |
| Mouse | Full support | Full support |
| Screen | Full support | Limited support |
| Clipboard | Full support | Full support |

### Screen Automation Limitations

The Keysender provider has the following limitations in screen automation:

- Limited support for getting accurate screen size
- Limited support for window positioning and resizing
- Screenshot functionality may not work in all environments

If you need comprehensive screen automation, the NutJS provider is recommended.
