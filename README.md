# VS Code licence-key starter

A small, working template for a Visual Studio Code extension with a **free tier** and a **Pro tier** that is unlocked by a licence key.

**Status:** work in progress. This is the foundation I am building my VS Code extensions on. No extension has been released from it yet.

## What it does

| Command | What happens |
|---|---|
| `Starter: Free Hello` | A free feature that always works |
| `Starter: Pro Hello (needs Pro)` | A Pro feature; asks you to buy or enter a key if there is no valid licence |
| `Starter: Buy Pro` | Opens the checkout link in your browser |
| `Starter: Enter Pro Licence Key` | Activates a key on this machine |
| `Starter: Show Licence Status` | Shows whether this machine is Free or Pro |
| `Starter: Remove Licence From This Machine` | Deactivates the key so it can be used on another machine |

## How the licence check works

- Keys are activated, validated and deactivated through [Dodo Payments](https://dodopayments.com)' public licence endpoints. Only public endpoints are called, so **no secret API key is shipped** inside the extension.
- The key is kept in VS Code's encrypted secret storage, and the activation id in extension state.
- Pro is true only while the provider still reports the key as valid. If the network is unavailable the extension falls back to Free (a grace period for offline use is a planned improvement).
- The code has a `test` and a `live` environment switch in `src/licence.js`. Put your own checkout link there.

## Privacy

The licence check sends the licence key and the computer name to the payment provider to confirm the key is valid. Nothing else leaves your machine.

## Develop and test

```
npm run check    # syntax check
npm test         # 5 offline unit tests (fake network, in-memory storage), Node 20+
npm run package  # build a .vsix with vsce
```

The unit tests replace the network with a fake `fetch`, so they run offline and need no account.

## Layout

```
extension.js        commands and the Pro gate
src/licence.js      activate / validate / deactivate against the provider
test/licence.test.js
```

## Licence

Copyright (c) 2026 Imad Muratspahic. All rights reserved. The source is published for reference and review; please ask before reusing it.
