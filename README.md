# metro-dreamland

Windows Phone 7/8 and Windows 8's "Metro", for [dreamland](https://dreamland.js.org/):
a stylesheet, a set of components, and the motion (turnstiles, feathering,
continuum, pivots, panoramas, tilt, live tiles, Windows 10's reveal).

It started as part of [bomberfish.ca](https://bomberfish.ca), which vendors
it as a git submodule. Everything it has is shown off, and can be tried, in
[metro-dreamland-showcase](https://github.com/bomberfish/metro-dreamland-showcase).

## What's in it

| | | On a phone | On a tablet or desktop |
|---|---|---|---|
| **Pages** | `Page`, `PageHeader`, `Pivot`, `Panorama`, `Link` | Windows Phone 8; the pivot's strip drags sideways to the headers off the edge | Windows 8; the pivot's headers as WinJS's Pivot had them, scrolling like tabs when they don't fit |
| **Sections** | `Sections`, `NavPane` (a sidebar) | the pivot | the pivot, or Windows 8's PC settings sidebar: the app's rules say which (below) |
| **Tiles** | `Tiles`, `Tile` (flip, cycle), faces, slides, labels, counts | Windows Phone 8 | Windows 8 |
| **Buttons** | `Button`, `RingButton` | Windows Phone 8 | Windows 8 |
| **Forms** | `CheckBox`, `RadioButton`, `Toggle`, `TextBox` | Windows Phone 8 and its toolkit | Windows 8 |
| **Pickers** | `ListPicker`, `DatePicker`, `TimePicker` | the Windows Phone Toolkit | Windows 8's ComboBox; Windows 8.1's DatePicker and TimePicker |
| **Menus and dialogs** | `ContextMenu`, `showMessageBox()`, `AppBar`, `showToast()`, tooltips (`data-m-tip`) | the toolkit; Windows Phone 8 and 8.1 | Windows 8.1's MenuFlyout and AppBar; Windows 8 |
| **Sliders and loaders** | `Slider`, `ProgressBar`, `ProgressRing` | Windows 8 | Windows 8 |
| **Themes** | dark and light (`data-m-theme`), twenty accents | Windows Phone 8's | Windows 8's |
| **Materials** | flat, or Windows 10's acrylic (`setMaterial`) | WinUI's AcrylicBrush | WinUI's AcrylicBrush |

Every measure, colour and timing comes from Microsoft's own sources where
there is one: the Windows Phone 8 SDK's theme resources and default control
templates, the [Windows Phone Toolkit](https://github.com/microsoftarchive/WindowsPhoneToolkit)'s
templates and code (MS-PL), the Windows 8.1 "styles and templates" pages
on Microsoft Learn, and [WinJS](https://github.com/winjs/winjs) (MIT) for
the pivot on a desktop. The phone's app bar, which its shell drew itself,
follows [Cornflower](https://github.com/wdcossey/Cornflower)'s frame-by-frame
measurements of a Windows Phone 8.1 device. Each component's file says which
it follows.

### The form factor

The controls are the phone's on a phone and Windows 8's everywhere else. That's
`data-m-form-factor="phone"` or `"desktop"` on `<html>`, which `startMetro()`
sets from the window (narrow, or short and touched) and keeps up as it
changes, unless one's been forced:

```ts
import { setFormFactor } from "metro-dreamland";

setFormFactor("phone"); // or "desktop", or "auto"; remembered on the device
```

For a page from the server, set it before the first paint too, in the
`<head>`, so a phone doesn't start with the desktop's controls:

```html
<script>
	(function (d) {
		var f = null;
		try { f = localStorage.getItem("m-form-factor"); } catch (e) {}
		if (f !== "phone" && f !== "desktop")
			f = matchMedia("(max-width: 37.49rem), (max-height: 29.99rem) and (pointer: coarse)").matches ? "phone" : "desktop";
		d.setAttribute("data-m-form-factor", f);
	})(document.documentElement);
</script>
```

### Navigation: a pivot or a sidebar

An app with several sections can show them as a pivot (the strip of names
across the top) or as a sidebar (Windows 8's PC settings: a pane down the
left). Which one is the app's to say, for each kind of device and each way
up it's held; whatever's left out is a pivot:

```ts
startMetro({
	navigation: {
		phone: "pivot",
		tablet: { portrait: "pivot", landscape: "sidebar" },
		desktop: "sidebar",
	},
});
```

The kind of device is `"phone"` (the phone's form factor), `"tablet"` (a
finger's the main pointer) or `"desktop"`; the way up, `"portrait"` or
`"landscape"`. One style alone (`navigation: "sidebar"`) is for everything.
Each section's page draws `<Sections>`, which follows the rules as the
window turns or changes size:

```tsx
<Page kind="pivot">
	<Sections title="mail" items={SECTIONS} active="/inbox">
		…the inbox…
	</Sections>
</Page>
```

The person using the app can choose otherwise with `setNavigation(rules)`
(remembered on the device; `null` goes back to the app's). `navigation()`,
`idiom()` and `orientation()` say where things stand, and `<html>` carries
them as `data-m-navigation`, `data-m-idiom` and `data-m-orientation`; an
`m-navigation` event goes out when the style changes. The sidebar follows
the theme (dark or light) and the accent.

### Wheel gestures over a panorama

A panorama pans sideways with the mouse wheel, unless there's something
under the pointer that can still scroll (a list, say): then that scrolls.
By default that's decided for each wheel event, so a fast flick down a list
that reaches its end carries on as a pan. To have a gesture stay with what
it started scrolling instead, as the browser's own scrolling does, turn on
latching, for everything or for one element and what's inside it:

```ts
startMetro({ wheelLatch: true });
```

```html
<ol class="history" data-m-wheel-latch>…</ol>
<div data-m-wheel-latch="off">…</div>
```

The nearest `data-m-wheel-latch` wins: a list's says whether it keeps its
gesture, the panorama's whether a pan keeps going over a list.

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
/* and, for an app with no colours or type of its own, the phone's: */
@import "metro-dreamland/theme.css";
```

```html
<html data-m-theme="dark" data-m-accent="cobalt">
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

The pages and tiles take an app's own colours and type: custom properties on
`:root` for the accent, the surfaces, the type colours and the faces (the
list is at the top of `src/metro.css`). `theme.css` sets all of them from
the phone's theme, for an app that hasn't its own. The controls are drawn in
the phone's theme itself (dark, or light with `data-m-theme="light"`) and
the accent.

Icons are the app's: the app bar, round buttons and toasts take an icon
font's ligature or codepoint. bomberfish.ca's "Metro Symbols" (Segoe UI
Symbol's app bar glyphs, by name) is what the showcase uses.

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
