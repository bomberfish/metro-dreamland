import { ComponentChild, FC } from "dreamland/core";
import { exponential } from "../motion/ease";
import { EASE_OUT, hostEl, isPhone, still } from "../motion/core";
import { openLayer } from "./layer";
import { classes, rest, transparent } from "./props";

// The phone's context menu (the Windows Phone Toolkit's ContextMenu): hold
// something down (or right-click it) and the page shrinks back a little
// and dims (to 94%, under a 30% wash of the background, over 0.42s on an
// exponential ease), leaving what was held where it was, while a menu
// opens against it: a line drawn across first, then the menu dropping open
// from it, white on the dark theme (black on the light), its items in
// large light type. Below what was held if there's room, above if not.
// On a phone held upright it's as wide as the screen; anywhere wider, 480
// pixels, as the phone's was turned on its side. Styles: "Context menus"
// in controls.css.
//
// That's on a phone. Anywhere else (a tablet, a desktop) it's Windows 8.1's
// MenuFlyout instead: a white box with a 2-pixel black edge, always in the
// light theme whatever the page's, its items in black semibold at the
// control size (14.667), 20 pixels in, a pale grey under the pointer; at the
// pointer, or above whatever it's for (showMenuFlyout). Styles: "Menu
// flyouts" in controls.css.
//
// <ContextMenu items={...}>what it's for</ContextMenu>, or
// attachContextMenu(element, items) for something already on the page, or
// showContextMenu(element, items) to open one from code.

export type MenuEntry =
	| { label: string; onclick?: () => void; disabled?: boolean }
	| "-";

/** How long a finger has to stay down for it to be a hold. */
export const HOLD_MS = 500;

const ZOOM = 0.94;
const ZOOM_MS = 420;
// the menu's own opening: across over 0.3s, then down by 0.42s
const OPEN_MS = 420;
const ACROSS = 0.3 / 0.42;

let showing: Promise<void> | null = null;

export function showContextMenu(
	owner: Element,
	items: MenuEntry[],
	at?: { x: number; y: number },
	zoom = true
): Promise<void> {
	if (showing) return showing;
	if (!isPhone()) return showMenuFlyout(owner, items, at);
	const ownerBox = owner.getBoundingClientRect();
	const host = hostEl();
	const motion = !still();

	// ---- what's drawn ----
	const menu = (
		<div class="m-menu" role="menu">
			<i class="m-menu-edge" />
			<i class="m-menu-edge m-menu-edge-fill" />
			<div class="m-menu-inner">
				{items.map((item) =>
					item === "-" ? (
						<hr class="m-menu-separator" />
					) : (
						<button
							type="button"
							role="menuitem"
							class="m-menu-item"
							data-m-tilt
							disabled={item.disabled ? true : undefined}
						>
							{item.label}
						</button>
					)
				)}
			</div>
			<i class="m-menu-edge m-menu-edge-fill m-menu-edge-late" />
			<i class="m-menu-edge m-menu-edge-late" />
		</div>
	) as HTMLElement;
	const fade = (<div class="m-menu-fade" />) as HTMLElement;
	// (what was held stays where it was, over the shrunk page: a copy of it)
	const held = zoom ? (owner.cloneNode(true) as HTMLElement) : null;
	if (held) {
		held.classList.add("m-menu-held");
		held.removeAttribute("id");
		held.setAttribute("aria-hidden", "true");
		Object.assign(held.style, {
			left: `${ownerBox.left}px`,
			top: `${ownerBox.top}px`,
			width: `${ownerBox.width}px`,
			height: `${ownerBox.height}px`,
		});
	}

	let shrink: Animation | null = null;
	let picked: (() => void) | undefined;
	// (and the page shrinks without it: the toolkit took its picture of the
	// page with what was held made invisible)
	const was = (owner as HTMLElement).style?.visibility ?? "";
	if (held) (owner as HTMLElement).style.visibility = "hidden";
	const restore = () => {
		if (held) (owner as HTMLElement).style.visibility = was;
	};

	const layer = openLayer({
		class: "m-menu-layer",
		label: "context menu",
		from: owner,
		content: [fade, ...(held ? [held] : []), menu],
		enter: () => {
			place(menu, ownerBox, at);
			menu.querySelector<HTMLElement>(".m-menu-item:not(:disabled)")?.focus({
				preventScroll: true,
			});
			if (!motion) {
				fade.style.opacity = zoom ? "0.3" : "0";
				return;
			}
			if (zoom && host && host !== document.body) {
				const box = host.getBoundingClientRect();
				host.style.transformOrigin = `${innerWidth / 2 - box.left}px ${innerHeight / 2 - box.top}px`;
				shrink = host.animate(
					[{ transform: "scale(1)" }, { transform: `scale(${ZOOM})` }],
					{
						duration: ZOOM_MS,
						easing: exponential("in-out", 2),
						fill: "forwards",
					}
				);
				fade.animate([{ opacity: 0 }, { opacity: 0.3 }], {
					duration: ZOOM_MS,
					easing: exponential("in-out", 2),
					fill: "forwards",
				});
			}
			menu.animate(
				[
					{ transform: "scaleX(0)" },
					{ transform: "scaleX(1)", offset: ACROSS },
					{ transform: "scaleX(1)" },
				],
				{ duration: OPEN_MS, easing: "linear" }
			);
			menu.querySelector(".m-menu-inner")!.animate(
				[
					{ transform: "scaleY(0)" },
					{ transform: "scaleY(0)", offset: ACROSS },
					{ transform: "scaleY(1)" },
				],
				{ duration: OPEN_MS, easing: "linear" }
			);
			for (const late of menu.querySelectorAll(".m-menu-edge-late"))
				late.animate(
					[{ opacity: 0 }, { opacity: 0, offset: 0.976 }, { opacity: 1 }],
					{ duration: OPEN_MS }
				);
		},
		leave: async () => {
			// (the menu goes at once; the page comes back to its size)
			menu.style.visibility = "hidden";
			if (held) held.style.visibility = "hidden";
			if (shrink) {
				fade.animate([{ opacity: 0.3 }, { opacity: 0 }], {
					duration: ZOOM_MS,
					easing: exponential("in-out", 2),
					fill: "forwards",
				});
				shrink.reverse();
				await shrink.finished.catch(() => {});
				shrink.cancel();
				host!.style.transformOrigin = "";
			}
			restore();
		},
	});
	showing = layer.closed.then(() => {
		showing = null;
		picked?.();
	});

	const buttons = Array.from(
		menu.querySelectorAll<HTMLButtonElement>(".m-menu-item")
	);
	const actions = items.filter((i) => i !== "-") as Exclude<MenuEntry, "-">[];
	buttons.forEach((b, i) =>
		b.addEventListener("click", () => {
			picked = actions[i].onclick;
			void layer.close();
		})
	);
	menu.addEventListener("keydown", (e) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const live = buttons.filter((b) => !b.disabled);
		const now = live.indexOf(document.activeElement as HTMLButtonElement);
		const next =
			live[(now + (e.key === "ArrowDown" ? 1 : -1) + live.length) % live.length];
		next?.focus();
	});
	return showing;
}

/**
 * Windows 8.1's MenuFlyout: `items` in a flyout at `at` (where the pointer
 * was), or, without one, over `owner` (its default placement, Top),
 * centred on it; kept inside the window either way.
 */
export function showMenuFlyout(
	owner: Element,
	items: MenuEntry[],
	at?: { x: number; y: number }
): Promise<void> {
	if (showing) return showing;
	const box = owner.getBoundingClientRect();
	const flyout = (
		<div class="m-flyout" role="menu">
			{items.map((item) =>
				item === "-" ? (
					<hr class="m-flyout-separator" />
				) : (
					<button
						type="button"
						role="menuitem"
						class="m-flyout-item"
						disabled={item.disabled ? true : undefined}
					>
						{item.label}
					</button>
				)
			)}
		</div>
	) as HTMLElement;
	let picked: (() => void) | undefined;
	let from = 0;
	const layer = openLayer({
		class: "m-flyout-layer",
		label: "menu",
		from: owner,
		content: flyout,
		enter: () => {
			const w = flyout.offsetWidth;
			const h = flyout.offsetHeight;
			const gap = 4;
			let x: number;
			let y: number;
			if (at) {
				x = at.x;
				y = at.y;
				if (x + w > innerWidth - gap) x = at.x - w;
				if (y + h > innerHeight - gap) y = at.y - h;
				from = y < at.y ? 1 : -1;
			} else {
				x = box.left + box.width / 2 - w / 2;
				y = box.top - h - gap;
				from = 1;
				if (y < gap) {
					y = box.bottom + gap;
					from = -1;
				}
			}
			flyout.style.left = `${Math.max(gap, Math.min(x, innerWidth - w - gap))}px`;
			flyout.style.top = `${Math.max(gap, Math.min(y, innerHeight - h - gap))}px`;
			flyout
				.querySelector<HTMLElement>(".m-flyout-item:not(:disabled)")
				?.focus({ preventScroll: true });
			// (it comes out from where it was opened: a short slide and a fade)
			if (!still())
				flyout.animate?.(
					[
						{ opacity: 0, transform: `translateY(${from * 20}px)` },
						{ opacity: 1, transform: "none" },
					],
					{ duration: 250, easing: EASE_OUT }
				);
		},
		leave: () =>
			still()
				? null
				: flyout.animate?.([{ opacity: 1 }, { opacity: 0 }], {
						duration: 100,
						fill: "forwards",
					}).finished,
	});
	showing = layer.closed.then(() => {
		showing = null;
		picked?.();
	});
	const buttons = Array.from(
		flyout.querySelectorAll<HTMLButtonElement>(".m-flyout-item")
	);
	const actions = items.filter((i) => i !== "-") as Exclude<MenuEntry, "-">[];
	buttons.forEach((b, i) =>
		b.addEventListener("click", () => {
			picked = actions[i].onclick;
			void layer.close();
		})
	);
	flyout.addEventListener("keydown", (e) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		const live = buttons.filter((b) => !b.disabled);
		const now = live.indexOf(document.activeElement as HTMLButtonElement);
		live[(now + (e.key === "ArrowDown" ? 1 : -1) + live.length) % live.length]?.focus();
	});
	return showing;
}

// Where it goes: the toolkit's own rule (ContextMenu.cs,
// AdjustContextMenuPositionForPortraitMode). Under what was held if it fits
// there, over it if not, at the finger if neither, and failing all of
// those at the foot of the window.
function place(menu: HTMLElement, owner: DOMRect, at?: { x: number; y: number }) {
	const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
	const narrow = innerWidth <= 36 * rem;
	const width = narrow ? innerWidth : Math.min(24 * rem, innerWidth);
	const x = narrow
		? 0
		: Math.max(0, Math.min((at?.x ?? owner.left), innerWidth - width));
	menu.style.width = `${width}px`;
	menu.style.left = `${x}px`;
	const h = menu.offsetHeight;
	const lowestTop = innerHeight - h;
	let y: number;
	let reversed = false;
	if (owner.bottom <= lowestTop) y = owner.bottom;
	else if (owner.top >= h) {
		y = owner.top - h;
		reversed = true;
	} else if (at && at.y <= lowestTop) y = at.y;
	else if (at && at.y >= h) {
		y = at.y - h;
		reversed = true;
	} else {
		y = Math.max(0, lowestTop);
		reversed = y > 0;
	}
	menu.style.top = `${y}px`;
	menu.toggleAttribute("data-reversed", reversed);
}

/**
 * Give `el` a context menu: a right-click, or a finger held on it. Returns
 * a function that takes it off again.
 */
export function attachContextMenu(
	el: HTMLElement,
	items: MenuEntry[] | (() => MenuEntry[]),
	zoom = true
) {
	const list = () => (typeof items === "function" ? items() : items);
	let timer = 0;
	let start: { x: number; y: number } | null = null;
	let swallow = false;
	const cancel = () => {
		clearTimeout(timer);
		start = null;
	};
	const down = (e: PointerEvent) => {
		if (e.pointerType === "mouse") return;
		start = { x: e.clientX, y: e.clientY };
		const at = start;
		timer = window.setTimeout(() => {
			swallow = true;
			void showContextMenu(el, list(), at, zoom);
		}, HOLD_MS);
	};
	const move = (e: PointerEvent) => {
		if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10)
			cancel();
	};
	const menu = (e: MouseEvent) => {
		e.preventDefault();
		cancel();
		void showContextMenu(el, list(), { x: e.clientX, y: e.clientY }, zoom);
	};
	// (the press that opened it isn't also a click on what was held)
	const click = (e: MouseEvent) => {
		if (!swallow) return;
		swallow = false;
		e.preventDefault();
		e.stopImmediatePropagation();
	};
	el.classList.add("m-menu-owner");
	el.addEventListener("pointerdown", down);
	el.addEventListener("pointermove", move);
	el.addEventListener("pointerup", cancel);
	el.addEventListener("pointercancel", cancel);
	el.addEventListener("contextmenu", menu);
	el.addEventListener("click", click, true);
	return () => {
		cancel();
		el.classList.remove("m-menu-owner");
		el.removeEventListener("pointerdown", down);
		el.removeEventListener("pointermove", move);
		el.removeEventListener("pointerup", cancel);
		el.removeEventListener("pointercancel", cancel);
		el.removeEventListener("contextmenu", menu);
		el.removeEventListener("click", click, true);
	};
}

/** Its children, with a context menu: held, or right-clicked. */
export function ContextMenu(
	this: FC<
		{
			items: MenuEntry[];
			/** shrink the page back as it opens (the toolkit's IsZoomEnabled) */
			zoom?: boolean;
			class?: string;
			children?: ComponentChild;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const items = this.items;
	const zoom = this.zoom ?? true;
	const el = (
		<div
			class={classes("m-menu-target", this.class)}
			{...rest(this, ["items", "zoom"])}
		>
			{this.children}
		</div>
	) as HTMLElement;
	if (typeof window !== "undefined") attachContextMenu(el, items, zoom);
	return el;
}

export default ContextMenu;
