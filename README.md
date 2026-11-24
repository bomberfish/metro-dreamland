# metro-dreamland

Windows Phone 7/8 and Windows 8's "Metro", for [dreamland](https://dreamland.js.org/):
a stylesheet, a set of components, and the motion (turnstiles, feathering,
continuum, pivots, panoramas, tilt, live tiles, Windows 10's reveal).

It started as part of [bomberfish.ca](https://bomberfish.ca), which vendors
it as a git submodule.

## Status

- **Source only.** The package ships its TypeScript and CSS as they are,
  for the app's bundler to compile along with its own code (Vite does this
  for a linked package). There's no build step and no `.d.ts` output yet.
- **Not on npm yet.** `"private": true` until it is. Vendor it instead (below).
- **dreamland** is a peer dependency: the app provides it.

## Using it

As a submodule, linked in as a dependency:

```sh
git submodule add https://github.com/bomberfish/metro-dreamland.git vendor/metro-dreamland
```

```jsonc
// package.json
"dependencies": {
	"dreamland": "...",
	"metro-dreamland": "link:vendor/metro-dreamland"
}
```

The stylesheet, before the app's own (which then has the last word):

```css
@import "metro-dreamland/metro.css";
```

The motion, started before the app hydrates and told when it has:

```ts
import { metroReady, startMetro } from "metro-dreamland";

startMetro({ outlet: "#app main", host: "#app" });
hydrate(/* ... */);
metroReady();
```

`startMetro` takes any of `MetroConfig` (`src/motion/core.ts`): where the
page and its host are, what's behind a panorama, what Reveal lights, the
default material, and which paths are faces of one pivot.

The components are dreamland components and only say what they are, with
`data-m-*` attributes; the motion does the rest. Anything else can carry the
same attributes. The full list of both is at the top of `src/index.ts`.

### What the app provides

The library has no colours or type of its own. It expects these custom
properties on `:root`: the accent, the surfaces, the type colours and the
type faces. The list is at the top of `src/metro.css`. It defines Windows
Phone 8's twenty accent colours (`--m-lime` … `--m-taupe`) and the materials
itself.

### Before the first paint (optional)

To hold the first page back until its entrance can play, put
`m-boot` on `<html>` from an inline script in the page's `<head>`, and take
it off again after a moment in case the app never gets there:

```html
<script>
	(function (d) {
		if (d.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
			d.classList.add("m-boot");
			setTimeout(function () { d.classList.remove("m-boot"); }, 900);
		}
	})(document.documentElement);
</script>
```

`metroReady()` removes it as the entrance starts.

## Checking it

It has no dependencies of its own installed, so it's type-checked from
inside an app that has dreamland and TypeScript (the imports resolve up
through the app's `node_modules`):

```sh
node_modules/.bin/tsc -p vendor/metro-dreamland
```

## Licence

MIT.
