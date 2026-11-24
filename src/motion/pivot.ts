import { isPhone, SSR } from "./core";

// A pivot's strip of headers on a tablet or desktop: WinJS's two modes
// (winjs/winjs, Controls/Pivot/_Pivot.ts).
//
//   static     every header fits: they stand in their fixed order, the
//              current one lit, and don't move from page to page
//              (data-m-static on the strip)
//   overflow   they don't all fit: the phone's strip, the current one
//              first and the rest going round after it, with WinJS's two
//              buttons at the ends for a mouse
//
// On the phone it's always the phone's strip. Each header says where it
// comes in the order (data-m-i); this puts them in the order for the mode.

const headersOf = (strip: Element) =>
	Array.from(strip.children).filter((el) =>
		el.hasAttribute("data-m-i")
	) as HTMLElement[];

const indexOf = (el: Element) => Number(el.getAttribute("data-m-i"));

function settle(strip: HTMLElement) {
	const headers = headersOf(strip);
	if (headers.length < 2) return;
	const current = headers.find((el) => el.hasAttribute("aria-current"));
	if (!current) return;
	const n = headers.length;
	const at = indexOf(current);
	let fits = false;
	if (!isPhone()) {
		// (the headers' own widths, and the gaps between them, against the
		// room from where the strip starts to the window's right edge)
		const style = getComputedStyle(strip);
		const gap = parseFloat(style.columnGap) || 0;
		const width =
			headers.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) +
			gap * (n - 1);
		const left = headers
			.map((el) => el.getBoundingClientRect().left)
			.reduce((a, b) => Math.min(a, b));
		fits = left + width <= innerWidth - 12;
	}
	const order = fits
		? [...headers].sort((a, b) => indexOf(a) - indexOf(b))
		: [...headers].sort(
				(a, b) =>
					((indexOf(a) - at + n) % n) - ((indexOf(b) - at + n) % n)
			);
	if (order.some((el, i) => headers[i] !== el)) {
		for (const el of order) strip.append(el);
		// (the buttons after the headers, as they were)
		for (const b of strip.querySelectorAll(".m-pivot-nav")) strip.append(b);
	}
	strip.toggleAttribute("data-m-static", fits);
	// (where the strip goes out of sight, for the button at that end)
	const left = strip.getBoundingClientRect().left;
	const end = document.documentElement.clientWidth - 12;
	strip.style.setProperty("--m-pivot-end", `${Math.round(end - left)}px`);
}

/** Put the pivots' strips in `scope` in the mode that suits them now. */
export function settlePivots(scope: ParentNode = document) {
	if (SSR) return;
	for (const strip of scope.querySelectorAll<HTMLElement>("[data-m-pivot]"))
		settle(strip);
}

/**
 * The section after the current one (1) or before it (-1), in the strip's
 * fixed order, going round: its link, if it has one.
 */
export function stepOf(strip: Element, dir: 1 | -1) {
	const headers = headersOf(strip);
	const current = headers.find((el) => el.hasAttribute("aria-current"));
	if (!current || headers.length < 2) return null;
	const n = headers.length;
	const want = (indexOf(current) + dir + n) % n;
	return (
		(headers.find(
			(el) => el instanceof HTMLAnchorElement && indexOf(el) === want
		) as HTMLAnchorElement | undefined) ?? null
	);
}
