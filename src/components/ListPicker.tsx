import { FC } from "dreamland/core";
import { swingIn } from "../motion/transitions";
import { exponential } from "../motion/ease";
import { isPhone, release, still } from "../motion/core";
import { openLayer } from "./layer";
import { classes, rest, transparent } from "./props";

// The phone's list picker (the Windows Phone Toolkit's ListPicker): one of
// a few things, chosen in place. Closed, it's a box showing the one chosen.
// Pressed, it opens where it is, the box turning white and growing to show
// every item, the chosen one in the accent; pressing one chooses it and the
// box closes round it again (0.2s, an exponential ease in and out with an
// exponent of 4, as the toolkit's). With more than `threshold` items (5,
// the toolkit's ItemCountThreshold) it opens a page of its own instead: the
// header in capitals, then the items in large light type to pick from.
// Styles: "List pickers" in controls.css.
//
// That's on a phone. Anywhere else it's Windows 8's ComboBox: a pale box
// (80% white) with a 2-pixel edge, black type at the control size and a
// chevron at the right; pressed, its list drops down over it, white with a
// dark edge, placed so the chosen item is where the box was, the chosen one
// filled with the accent. A long list scrolls rather than opening a page.
//
// `items` are strings, or { value, label } where they differ. With `name`
// it's in a form, as a hidden input. Like the other controls here it's
// drawn once (a page from the server is hydrated, not redrawn): it keeps
// itself in step as it's used, and placeListPicker() moves it from outside.

export type ListPickerItem = string | { value: string; label: string };

const valueOf = (item: ListPickerItem) =>
	typeof item === "string" ? item : item.value;
const labelOf = (item: ListPickerItem) =>
	typeof item === "string" ? item : item.label;

let ids = 0;

export function ListPicker(
	this: FC<
		{
			header?: string;
			/** the full-page list's own header (the header, if not) */
			fullHeader?: string;
			items: ListPickerItem[];
			value?: string;
			name?: string;
			threshold?: number;
			disabled?: boolean;
			onchange?: (value: string) => void;
			class?: string;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const items = this.items;
	const threshold = this.threshold ?? 5;
	const full = items.length > threshold;
	let at = Math.max(
		0,
		items.findIndex((item) => valueOf(item) === this.value)
	);
	const id = `m-listpicker-${++ids}`;
	const header = this.header;
	// (what it's called, with no header to say: an aria-label)
	const name = header ?? (this["aria-label"] as string | undefined);
	const fullHeader = this.fullHeader ?? this.header ?? "";
	const onchange = this.onchange;

	let root: HTMLElement;
	const box = () => root.querySelector<HTMLElement>(".m-listpicker-box")!;
	const options = () =>
		Array.from(root.querySelectorAll<HTMLElement>("[role=option]"));

	const choose = (index: number) => {
		at = index;
		placeListPicker(root, valueOf(items[index]));
		onchange?.(valueOf(items[index]));
	};

	// ---- opened in place ----
	const away = (e: Event) => {
		if (!root.contains(e.target as Node)) shut();
	};
	const open = () => {
		if (root.hasAttribute("data-open")) return;
		root.setAttribute("data-open", "");
		box().setAttribute("aria-expanded", "true");
		for (const o of options()) o.tabIndex = -1;
		const chosen = options()[at];
		chosen.tabIndex = 0;
		if (!isPhone()) drop();
		chosen.focus({ preventScroll: true });
		document.addEventListener("pointerdown", away, true);
	};
	// Windows 8's: the list over the box, the chosen item where the box's
	// text was, moved only as far as it takes to stay in the window
	const drop = () => {
		const list = root.querySelector<HTMLElement>(".m-listpicker-list")!;
		const chosen = options()[at];
		list.style.setProperty("--drop-y", "0px");
		list.scrollTop = 0;
		const b = box().getBoundingClientRect();
		const l = list.getBoundingClientRect();
		const c = chosen.getBoundingClientRect();
		// (scrolled, if it's taller than it may be, to have the chosen one
		// in sight)
		if (list.scrollHeight > list.clientHeight)
			list.scrollTop = Math.max(0, c.top - l.top - list.clientHeight / 2);
		const shown = chosen.getBoundingClientRect();
		let y = b.top + b.height / 2 - (shown.top + shown.height / 2 - l.top) - l.top;
		const top = l.top + y;
		if (top < 8) y += 8 - top;
		if (top + l.height > innerHeight - 8) y -= top + l.height - (innerHeight - 8);
		list.style.setProperty("--drop-y", `${y}px`);
	};
	const shut = (focus = false) => {
		if (!root.hasAttribute("data-open")) return;
		root.removeAttribute("data-open");
		box().setAttribute("aria-expanded", "false");
		for (const o of options()) o.tabIndex = -1;
		document.removeEventListener("pointerdown", away, true);
		if (focus) box().focus({ preventScroll: true });
	};

	// ---- opened as a page ----
	const page = () => {
		const list = (
			<ul class="m-picker-list" role="listbox" aria-label={fullHeader}>
				{items.map((item, i) => (
					<li
						role="option"
						tabindex={i === at ? "0" : "-1"}
						aria-selected={i === at ? "true" : "false"}
						data-m-tilt
					>
						{labelOf(item)}
					</li>
				))}
			</ul>
		) as HTMLElement;
		const layer = openLayer({
			class: "m-picker-page m-listpicker-page",
			label: fullHeader,
			from: root,
			content: [
				<p class="m-picker-title">{fullHeader}</p>,
				list,
			] as Node[],
			enter: (dialog) => {
				const lines = Array.from(dialog.querySelectorAll("li"));
				(lines[at] as HTMLElement)?.focus({ preventScroll: true });
				lines[at]?.scrollIntoView({ block: "center" });
				// (the lines turn in one after another, as a page's do)
				return Promise.all(
					lines.slice(0, 12).map((li, i) => swingIn(li, false, i * 30))
				).then(() => release(dialog));
			},
			leave: (dialog) =>
				still()
					? null
					: dialog.animate?.([{ opacity: 1 }, { opacity: 0 }], {
							duration: 150,
							easing: exponential("in", 2),
							fill: "forwards",
						}).finished,
		});
		list.addEventListener("click", (e) => {
			const li = (e.target as Element).closest("li");
			if (!li) return;
			choose(Array.from(list.children).indexOf(li));
			void layer.close();
		});
		list.addEventListener("keydown", (e) => {
			const lines = Array.from(list.children) as HTMLElement[];
			const now = lines.indexOf(document.activeElement as HTMLElement);
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const next = lines[now + (e.key === "ArrowDown" ? 1 : -1)];
				next?.focus();
			} else if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				if (now >= 0) {
					choose(now);
					void layer.close();
				}
			}
		});
	};

	const press = () => {
		if (root.hasAttribute("data-disabled")) return;
		if (full && isPhone()) page();
		else open();
	};

	root = (
		<div
			class={classes("m-listpicker", this.class)}
			data-disabled={this.disabled ? "" : undefined}
			style={`--n: ${items.length}; --i: ${at}`}
			{...rest(this, [
				"header",
				"fullHeader",
				"items",
				"value",
				"name",
				"threshold",
				"disabled",
				"onchange",
				"aria-label",
			])}
		>
			{header ? (
				<span class="m-header" id={`${id}-h`}>
					{header}
				</span>
			) : name ? (
				<span class="m-sr" id={`${id}-h`}>
					{name}
				</span>
			) : null}
			<div
				class="m-listpicker-box"
				role="button"
				tabindex={this.disabled ? "-1" : "0"}
				aria-haspopup="listbox"
				aria-expanded="false"
				aria-labelledby={name ? `${id}-h ${id}-s` : `${id}-s`}
				aria-disabled={this.disabled ? "true" : undefined}
				on:click={(e: Event) => {
					// (a press on an item of the open list chooses it)
					const li = (e.target as Element).closest("[role=option]");
					if (li && root.hasAttribute("data-open")) {
						choose(options().indexOf(li as HTMLElement));
						shut(true);
						return;
					}
					press();
				}}
				on:keydown={(e: KeyboardEvent) => {
					const opened = root.hasAttribute("data-open");
					const list = options();
					const now = list.indexOf(document.activeElement as HTMLElement);
					if (!opened) {
						if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
							e.preventDefault();
							press();
						}
						return;
					}
					if (e.key === "Escape" || e.key === "Tab") {
						if (e.key === "Escape") e.preventDefault();
						shut(e.key === "Escape");
					} else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						const next = list[now + (e.key === "ArrowDown" ? 1 : -1)];
						if (next) {
							list[now].tabIndex = -1;
							next.tabIndex = 0;
							next.focus({ preventScroll: true });
						}
					} else if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						if (now >= 0) choose(now);
						shut(true);
					}
				}}
			>
				<span class="m-listpicker-value" id={`${id}-s`}>
					{labelOf(items[at])}
				</span>
				<ul class="m-listpicker-list" role="listbox" id={`${id}-v`}>
					{items.map((item, i) => (
						<li
							role="option"
							tabindex="-1"
							data-value={valueOf(item)}
							aria-selected={i === at ? "true" : "false"}
						>
							{labelOf(item)}
						</li>
					))}
				</ul>
			</div>
			{this.name ? (
				<input type="hidden" name={this.name} value={valueOf(items[at])} />
			) : null}
		</div>
	) as HTMLElement;
	return root;
}

/** Put a list picker (the element, or anything in it) at `value`. */
export function placeListPicker(picker: Element | null | undefined, value: string) {
	const root = picker?.closest(".m-listpicker") as HTMLElement | null;
	if (!root) return;
	const options = Array.from(
		root.querySelectorAll<HTMLElement>(".m-listpicker-list [role=option]")
	);
	const index = options.findIndex((o) => o.dataset.value === value);
	if (index < 0) return;
	options.forEach((o, i) =>
		o.setAttribute("aria-selected", i === index ? "true" : "false")
	);
	root.style.setProperty("--i", `${index}`);
	const shown = root.querySelector(".m-listpicker-value");
	if (shown) shown.textContent = options[index].textContent;
	const hidden = root.querySelector<HTMLInputElement>("input[type=hidden]");
	if (hidden) hidden.value = value;
}

export default ListPicker;
