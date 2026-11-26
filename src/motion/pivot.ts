import { isPhone, SSR } from "./core";

// A pivot's strip of headers.
//
// On a tablet or desktop:
//
//   static     every header fits: they stand in their fixed order, the
//              current one lit, and don't move from page to page, as
//              WinJS's Pivot had them there (winjs/winjs,
//              Controls/Pivot/_Pivot.ts)
//   scrolling  they don't all fit: the same, in the same order, but the
//              strip ends at the window's edge and scrolls sideways to the
//              rest, as a strip of tabs does (data-m-scroll). A mouse gets
//              a button at each end, where there's more that way; a
//              trackpad or a finger just scrolls it. Where it's scrolled to
//              carries over from page to page, and the current one is
//              always brought into sight.
//
// Both are data-m-static: changing section, only the light moves (see
// pivotOut, ./transitions.ts). On the phone it's the phone's strip, the
// current one first and the rest going round after it, off the edge of the
// screen; where they don't all fit, a finger scrolls it sideways to the
// rest (data-m-scroll too, but not data-m-static). It starts from the
// current one each page, since that's always first. Each header says where
// it comes in the order (data-m-i); this puts them in the order for the
// mode.
//
// A sidebar (<NavPane>, data-m-pivot="pane") is a static strip too, but one
// that lays itself out: it's left as it is.

const headersOf = (strip: Element) =>
	Array.from(strip.children).filter((el) =>
		el.hasAttribute("data-m-i")
	) as HTMLElement[];

const indexOf = (el: Element) => Number(el.getAttribute("data-m-i"));

// where each strip of sections was scrolled to (by its sections, so the
// next page's strip, a new element, picks it up)
const scrolled = new Map<string, number>();
const keyOf = (strip: Element) =>
	headersOf(strip)
		.sort((a, b) => indexOf(a) - indexOf(b))
		.map((el) => (el.textContent ?? "").trim())
		.join("\n");
const watched = new WeakSet<Element>();

// which ends of a scrolling strip have more beyond them
function edges(strip: HTMLElement) {
	const max = strip.scrollWidth - strip.clientWidth;
	strip.toggleAttribute("data-m-before", strip.scrollLeft > 1);
	strip.toggleAttribute("data-m-after", strip.scrollLeft < max - 1);
}

function settle(strip: HTMLElement) {
	if (strip.getAttribute("data-m-pivot") === "pane") return;
	const headers = headersOf(strip);
	if (headers.length < 2) return;
	const current = headers.find((el) => el.hasAttribute("aria-current"));
	if (!current) return;
	const n = headers.length;
	const at = indexOf(current);
	const phone = isPhone();
	const order = phone
		? [...headers].sort(
				(a, b) =>
					((indexOf(a) - at + n) % n) - ((indexOf(b) - at + n) % n)
			)
		: [...headers].sort((a, b) => indexOf(a) - indexOf(b));
	const moved = order.some((el, i) => headers[i] !== el);
	if (moved) {
		for (const el of order) strip.append(el);
		// (the buttons after the headers, as they were)
		for (const b of strip.querySelectorAll(".m-pivot-nav")) strip.append(b);
	}
	strip.toggleAttribute("data-m-static", !phone);
	// the room: from where the headers start to the window's right edge (on
	// the phone, the screen's very edge, which they run off)
	const end = document.documentElement.clientWidth - (phone ? 0 : 12);
	// (the headers' own widths, and the gaps between them, against it)
	const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
	const width =
		headers.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) +
		gap * (n - 1);
	const fits =
		order[0].getBoundingClientRect().left + strip.scrollLeft + width <= end;
	const scrolls = !fits;
	strip.toggleAttribute("data-m-scroll", scrolls);
	// (measured as it now is: scrolling, the strip starts where its headers
	// do, and is as wide as the room it has)
	const box = strip.getBoundingClientRect();
	strip.style.setProperty("--m-pivot-end", `${Math.round(end - box.left)}px`);
	if (!scrolls) {
		strip.removeAttribute("data-m-before");
		strip.removeAttribute("data-m-after");
		return;
	}
	const key = keyOf(strip);
	const fresh = !watched.has(strip);
	if (fresh) {
		watched.add(strip);
		strip.addEventListener(
			"scroll",
			() => {
				if (strip.hasAttribute("data-m-scroll") && !isPhone())
					scrolled.set(key, strip.scrollLeft);
				edges(strip);
			},
			{ passive: true }
		);
	}
	if (phone) {
		// (the current one's first: a new strip, or one that's just come
		// round to another, starts at the start; one that's been scrolled is
		// otherwise left where the finger put it, through the window
		// changing size as the browser's bars come and go)
		if (fresh || moved) strip.scrollLeft = 0;
		edges(strip);
		return;
	}
	// where it was, then far enough that the current one's in sight
	// (clear of the buttons at the ends)
	strip.scrollLeft = scrolled.get(key) ?? 0;
	const pad = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
	const from = current.offsetLeft - pad - 20;
	const to = current.offsetLeft + current.offsetWidth + 20 - strip.clientWidth + pad;
	if (strip.scrollLeft > from) strip.scrollLeft = from;
	else if (strip.scrollLeft < to) strip.scrollLeft = to;
	scrolled.set(key, strip.scrollLeft);
	edges(strip);
}

/** Put the pivots' strips in `scope` in the mode that suits them now. */
export function settlePivots(scope: ParentNode = document) {
	if (SSR) return;
	for (const strip of scope.querySelectorAll<HTMLElement>("[data-m-pivot]"))
		settle(strip);
}

/**
 * Scroll a scrolling strip (see the top) along by most of its width, to
 * the next sections that are out of sight: forwards (1) or back (-1).
 */
export function scrollPivot(strip: HTMLElement, dir: 1 | -1) {
	const by = Math.max(strip.clientWidth * 0.8, 1);
	const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
	strip.scrollBy({ left: dir * by, behavior: still ? "auto" : "smooth" });
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
