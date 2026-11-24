import { FC } from "dreamland/core";
import { exponential } from "../motion/ease";
import { still } from "../motion/core";
import { AppBar } from "./AppBar";
import { ListPicker } from "./ListPicker";
import { openLayer } from "./layer";
import { classes, rest, transparent } from "./props";

// The phone's date and time pickers (the Windows Phone Toolkit's DatePicker
// and TimePicker). On the page, a button with the value on it under a
// subtle header. Pressed, it opens a page of its own: the theme's chrome,
// "CHOOSE DATE" at the top, and a column of squares for each part (month,
// day and year; hour, minute and AM/PM), 148 pixels a square, each with
// its number large and its name small in the corner, the chosen one filled
// with the accent. Touch a column and its squares all show their edges;
// slide it, or tap a square, to choose; a column of months or days goes
// round and round. The app bar's two buttons say done or cancel. The page
// swings up into place (a plane projection from -50 degrees, 0.2s) and
// away over the top (to 90, an exponential ease in). Styles: "Date and
// time pickers" in controls.css.
//
// The parts, their order, and how the value is written on the button are
// the visitor's locale's, as the toolkit's were the phone's culture's. The
// years run from 1601 to 3000, as the toolkit's did.
//
// That's on a phone. Anywhere else they're Windows 8.1's: a combo box for
// each part, side by side, 20 pixels apart, under a semilight header: the
// month by name, the day and the year by number (years from a hundred
// before this one to a hundred after, its default range); the hour, the
// minute in two figures, AM or PM. Both are drawn, and the stylesheet
// shows the one for the form factor (formfactor.ts), so the value is the
// same in each whichever is in use.

const MIN_YEAR = 1601;
const MAX_YEAR = 3000;
const SQUARE = 148 * 0.05; // rem: the toolkit's ItemSize (148), 20 phone pixels to the rem
const LAPS = 41; // copies of a looping column's items, for it to go round in

const daysIn = (year: number, month: number) =>
	new Date(year, month + 1, 0).getDate();

// ---- a looping selector: one column ----

interface Column {
	el: HTMLElement;
	/** the index of the chosen item */
	get: () => number;
	/** draw it again with `count` items, keeping the choice where it can */
	redraw: (count: number) => void;
	/** scroll to the choice (once it's on the page, where it has a size) */
	place: () => void;
}

function column(options: {
	label: string;
	count: number;
	at: number;
	loop: boolean;
	draw: (i: number) => [number: string, name?: string];
	onchange: (i: number) => void;
}): Column {
	let count = options.count;
	let at = options.at;
	const el = document.createElement("div");
	el.className = "m-loop";
	el.setAttribute("role", "listbox");
	el.setAttribute("aria-label", options.label);
	el.tabIndex = 0;
	const track = document.createElement("div");
	track.className = "m-loop-track";
	el.append(track);

	const copies = () => (options.loop ? LAPS : 1);
	const square = () =>
		parseFloat(getComputedStyle(document.documentElement).fontSize) * SQUARE;
	const middle = () => (options.loop ? Math.floor(LAPS / 2) * count : 0);

	const fill = () => {
		track.replaceChildren();
		for (let lap = 0; lap < copies(); lap++)
			for (let i = 0; i < count; i++) {
				const [number, name] = options.draw(i);
				const item = document.createElement("div");
				item.className = "m-loop-item";
				item.dataset.i = `${i}`;
				item.setAttribute("role", "option");
				item.setAttribute("aria-label", name ? `${number} ${name}` : number);
				const n = document.createElement("span");
				n.className = "m-loop-number";
				n.textContent = number;
				item.append(n);
				if (name !== undefined) {
					const s = document.createElement("span");
					s.className = "m-loop-name";
					s.textContent = name;
					item.append(s);
				}
				track.append(item);
			}
	};
	const mark = () => {
		const centre = Math.round(el.scrollTop / square());
		track.querySelectorAll(".m-loop-item").forEach((item, k) => {
			const chosen = k === centre;
			item.classList.toggle("m-loop-chosen", chosen);
			item.setAttribute("aria-selected", `${chosen}`);
		});
	};
	// to item `k` of the track (one of the copies), at once or gliding there
	// over 500ms, the toolkit's select animation (an exponential ease)
	let gliding = 0;
	const goTo = (k: number, glide: boolean) => {
		const to = k * square();
		cancelAnimationFrame(gliding);
		if (!glide || still()) {
			el.scrollTop = to;
			return;
		}
		const from = el.scrollTop;
		const start = performance.now();
		const ease = (t: number) =>
			t < 0.5
				? (Math.exp(4 * t) - 1) / (Math.exp(2) - 1) / 2
				: 1 - (Math.exp(2 * (2 - 2 * t)) - 1) / (Math.exp(2) - 1) / 2;
		const step = (now: number) => {
			const t = Math.min(1, (now - start) / 500);
			el.scrollTop = from + (to - from) * ease(t);
			if (t < 1) gliding = requestAnimationFrame(step);
		};
		gliding = requestAnimationFrame(step);
	};
	// where the scrolling came to rest: that's the choice; and a looping
	// column is put back in its middle lap, so there's always more each way
	const settle = () => {
		const k = Math.round(el.scrollTop / square());
		const i = ((k % count) + count) % count;
		if (options.loop) {
			const back = middle() + i;
			if (Math.abs(back - k) >= count) {
				own = performance.now() + 200;
				el.scrollTop = back * square();
			}
		}
		mark();
		if (i !== at) {
			at = i;
			options.onchange(i);
		}
	};
	let quiet = 0;
	// (scrolling it does itself, putting the choice in the middle, isn't a
	// touch: it doesn't show the squares' edges)
	let own = 0;
	el.addEventListener("scroll", () => {
		if (performance.now() < own) return;
		el.setAttribute("data-expanded", "");
		clearTimeout(quiet);
		quiet = window.setTimeout(settle, 120);
	});
	el.addEventListener("pointerdown", () => {
		for (const other of el.parentElement?.querySelectorAll(".m-loop") ?? [])
			if (other !== el) other.removeAttribute("data-expanded");
		el.setAttribute("data-expanded", "");
	});
	el.addEventListener("click", (e) => {
		const item = (e.target as Element).closest<HTMLElement>(".m-loop-item");
		if (!item) return;
		const k = Array.from(track.children).indexOf(item);
		goTo(k, true);
	});
	el.addEventListener("keydown", (e) => {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		e.preventDefault();
		el.setAttribute("data-expanded", "");
		const k = Math.round(el.scrollTop / square());
		goTo(k + (e.key === "ArrowDown" ? 1 : -1), true);
	});

	fill();
	const place = () => {
		own = performance.now() + 200;
		goTo(middle() + at, false);
		mark();
	};
	return {
		el,
		get: () => at,
		redraw: (n) => {
			count = n;
			at = Math.min(at, n - 1);
			fill();
			place();
		},
		place,
	};
}

// ---- the page ----

type Part = "month" | "day" | "year" | "hour" | "minute" | "period";

function partsOf(kind: "date" | "time", locale?: string): Part[] {
	const fmt =
		kind === "date"
			? new Intl.DateTimeFormat(locale, {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				})
			: new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
	const map: Record<string, Part> = {
		month: "month",
		day: "day",
		year: "year",
		hour: "hour",
		minute: "minute",
		dayPeriod: "period",
	};
	return fmt
		.formatToParts(new Date(2026, 10, 24, 16, 5))
		.map((p) => map[p.type])
		.filter(Boolean);
}

const twelveHour = (locale?: string) =>
	new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions()
		.hour12 ?? false;

function pick(
	kind: "date" | "time",
	value: Date,
	from: Element,
	locale?: string
): Promise<Date | null> {
	const next = new Date(value);
	const h12 = twelveHour(locale);
	const monthName = (m: number) =>
		new Intl.DateTimeFormat(locale, { month: "long" }).format(
			new Date(2000, m, 1)
		);
	const dayName = (d: number) =>
		new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
			new Date(next.getFullYear(), next.getMonth(), d)
		);
	const two = (n: number) => `${n}`.padStart(2, "0");
	const periods = ["AM", "PM"].map((p, i) =>
		(
			new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true })
				.formatToParts(new Date(2000, 0, 1, i ? 13 : 1))
				.find((x) => x.type === "dayPeriod")?.value ?? p
		).toUpperCase()
	);

	const columns: Partial<Record<Part, Column>> = {};
	const days = () => {
		const d = columns.day;
		const n = daysIn(next.getFullYear(), next.getMonth());
		if (next.getDate() > n) next.setDate(n);
		d?.redraw(n);
	};
	const make: Record<Part, () => Column> = {
		month: () =>
			column({
				label: "month",
				count: 12,
				at: next.getMonth(),
				loop: true,
				draw: (i) => [two(i + 1), monthName(i)],
				onchange: (i) => {
					const day = next.getDate();
					next.setDate(1);
					next.setMonth(i);
					next.setDate(Math.min(day, daysIn(next.getFullYear(), i)));
					days();
				},
			}),
		day: () =>
			column({
				label: "day",
				count: daysIn(next.getFullYear(), next.getMonth()),
				at: next.getDate() - 1,
				loop: true,
				draw: (i) => [two(i + 1), dayName(i + 1)],
				onchange: (i) => next.setDate(i + 1),
			}),
		year: () =>
			column({
				label: "year",
				count: MAX_YEAR - MIN_YEAR + 1,
				at: next.getFullYear() - MIN_YEAR,
				loop: false,
				draw: (i) => [`${MIN_YEAR + i}`, " "],
				onchange: (i) => {
					const day = next.getDate();
					next.setDate(1);
					next.setFullYear(MIN_YEAR + i);
					next.setDate(
						Math.min(day, daysIn(MIN_YEAR + i, next.getMonth()))
					);
					days();
				},
			}),
		hour: () =>
			column({
				label: "hour",
				count: h12 ? 12 : 24,
				at: h12 ? (next.getHours() + 11) % 12 : next.getHours(),
				loop: true,
				draw: (i) => [h12 ? `${i + 1}` : `${i}`],
				onchange: (i) => {
					const pm = next.getHours() >= 12;
					next.setHours(h12 ? ((i + 1) % 12) + (pm ? 12 : 0) : i);
				},
			}),
		minute: () =>
			column({
				label: "minute",
				count: 60,
				at: next.getMinutes(),
				loop: true,
				draw: (i) => [two(i)],
				onchange: (i) => next.setMinutes(i),
			}),
		period: () =>
			column({
				label: "AM or PM",
				count: 2,
				at: next.getHours() >= 12 ? 1 : 0,
				loop: false,
				draw: (i) => [periods[i]],
				onchange: (i) => next.setHours((next.getHours() % 12) + (i ? 12 : 0)),
			}),
	};

	const parts = partsOf(kind, locale).filter((p) => p !== "period" || h12);
	for (const part of parts) columns[part] = make[part]();

	const title = kind === "date" ? "CHOOSE DATE" : "CHOOSE TIME";
	let result: Date | null = null;
	let layer: ReturnType<typeof openLayer>;
	const finish = (keep: boolean) => {
		result = keep ? new Date(next) : null;
		void layer.close();
	};
	const sheet = (
		<div class="m-picker-sheet">
			<p class="m-picker-title">{title}</p>
			<div class="m-loops" />
			<AppBar
				position="absolute"
				buttons={[
					{ icon: "", label: "done", onclick: () => finish(true) },
					{ icon: "", label: "cancel", onclick: () => finish(false) },
				]}
			/>
		</div>
	) as HTMLElement;
	sheet
		.querySelector(".m-loops")!
		.append(...parts.map((p) => columns[p]!.el));

	const swing = (frames: Keyframe[], timing: KeyframeAnimationOptions) =>
		still() ? null : sheet.animate?.(frames, { fill: "both", ...timing }).finished;

	return new Promise((resolve) => {
		layer = openLayer({
			class: "m-picker-page",
			label: title.toLowerCase(),
			from,
			content: sheet,
			enter: () => {
				for (const p of parts) columns[p]!.place();
				(sheet.querySelector(".m-loop") as HTMLElement | null)?.focus({
					preventScroll: true,
				});
				return swing(
					[
						{ transform: "perspective(1000px) rotateX(-50deg)" },
						{ transform: "perspective(1000px) rotateX(0deg)" },
					],
					{ duration: 200, easing: "linear" }
				);
			},
			leave: () =>
				swing(
					[
						{ transform: "perspective(1000px) rotateX(0deg)", opacity: 1 },
						{ transform: "perspective(1000px) rotateX(90deg)", opacity: 1 },
					],
					{ duration: 200, easing: exponential("in", 2) }
				),
		});
		void layer.closed.then(() => resolve(result));
	});

}

// ---- the fields ----

const iso = (d: Date, kind: "date" | "time") =>
	kind === "date"
		? `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`
		: `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;

const written = (d: Date, kind: "date" | "time", locale?: string) =>
	kind === "date"
		? d.toLocaleDateString(locale, {
				year: "numeric",
				month: "numeric",
				day: "numeric",
			})
		: d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

function field(self: FC<FieldProps>, kind: "date" | "time"): HTMLElement {
	transparent(self);
	let value = self.value ?? new Date();
	const locale = self.locale;
	const onchange = self.onchange;
	const disabled = !!self.disabled;
	let root: HTMLElement;

	// the value's changed (on either): everything that shows it, again
	const changed = (from: "phone" | "desk") => {
		root.querySelector(".m-datetime-button")!.textContent = written(
			value,
			kind,
			locale
		);
		const hidden = root.querySelector<HTMLInputElement>("input[type=hidden]");
		if (hidden) hidden.value = iso(value, kind);
		if (from === "phone")
			root.querySelector(".m-datetime-desk")!.replaceWith(desk());
		onchange?.(new Date(value));
	};

	// ---- Windows 8.1's: a combo box a part ----
	const h12 = twelveHour(locale);
	const now = new Date().getFullYear();
	const named = (o: Intl.DateTimeFormatOptions, d: Date) =>
		new Intl.DateTimeFormat(locale, o).format(d);
	const combo = (part: Part) => {
		const v = value;
		let items: { value: string; label: string }[];
		let at: number;
		let set: (n: number) => void;
		switch (part) {
			case "month":
				items = Array.from({ length: 12 }, (_, m) => ({
					value: `${m}`,
					label: named({ month: "long" }, new Date(2000, m, 1)),
				}));
				at = v.getMonth();
				set = (m) => {
					const day = v.getDate();
					v.setDate(1);
					v.setMonth(m);
					v.setDate(Math.min(day, daysIn(v.getFullYear(), m)));
				};
				break;
			case "day":
				items = Array.from(
					{ length: daysIn(v.getFullYear(), v.getMonth()) },
					(_, d) => ({ value: `${d + 1}`, label: `${d + 1}` })
				);
				at = v.getDate() - 1;
				set = (d) => v.setDate(d + 1);
				break;
			case "year": {
				const first = Math.min(now - 100, v.getFullYear());
				const last = Math.max(now + 100, v.getFullYear());
				items = Array.from({ length: last - first + 1 }, (_, y) => ({
					value: `${first + y}`,
					label: `${first + y}`,
				}));
				at = v.getFullYear() - first;
				set = (y) => {
					const day = v.getDate();
					v.setDate(1);
					v.setFullYear(first + y);
					v.setDate(Math.min(day, daysIn(first + y, v.getMonth())));
				};
				break;
			}
			case "hour":
				items = Array.from({ length: h12 ? 12 : 24 }, (_, i) => ({
					value: `${i}`,
					label: h12 ? `${i + 1}` : `${i}`,
				}));
				at = h12 ? (v.getHours() + 11) % 12 : v.getHours();
				set = (i) => {
					const pm = v.getHours() >= 12;
					v.setHours(h12 ? ((i + 1) % 12) + (pm ? 12 : 0) : i);
				};
				break;
			case "minute":
				items = Array.from({ length: 60 }, (_, i) => ({
					value: `${i}`,
					label: `${i}`.padStart(2, "0"),
				}));
				at = v.getMinutes();
				set = (i) => v.setMinutes(i);
				break;
			case "period":
				items = [0, 1].map((i) => ({
					value: `${i}`,
					label: named({ hour: "numeric", hour12: true }, new Date(2000, 0, 1, i ? 13 : 1))
						.replace(/[\d\s]/g, "")
						.toUpperCase() || (i ? "PM" : "AM"),
				}));
				at = v.getHours() >= 12 ? 1 : 0;
				set = (i) => v.setHours((v.getHours() % 12) + (i ? 12 : 0));
				break;
		}
		return (
			<ListPicker
				class={`m-datetime-part m-datetime-${part}`}
				aria-label={part === "period" ? "AM or PM" : part}
				items={items}
				value={items[at].value}
				threshold={Infinity}
				disabled={disabled || undefined}
				onchange={(chosen: string) => {
					set(items.findIndex((i) => i.value === chosen));
					// (a month or year with another number of days: the days
					// again)
					if (part === "month" || part === "year") {
						const day = root.querySelector(".m-datetime-day");
						day?.replaceWith(combo("day"));
					}
					changed("desk");
				}}
			/>
		);
	};
	const desk = () => (
		<div class="m-datetime-desk">
			{partsOf(kind, locale)
				.filter((p) => p !== "period" || h12)
				.map(combo)}
		</div>
	);

	root = (
		<div
			class={classes("m-datetime", `m-${kind}picker`, self.class)}
			{...rest(self, ["header", "value", "name", "locale", "onchange", "disabled"])}
		>
			{self.header ? <span class="m-header">{self.header}</span> : null}
			<button
				type="button"
				class="m-button m-datetime-button"
				data-m-tilt
				aria-haspopup="dialog"
				aria-label={self.header ? `${self.header}: ${written(value, kind, locale)}` : undefined}
				disabled={disabled || undefined}
				on:click={async () => {
					const chosen = await pick(kind, value, root, locale);
					if (!chosen) return;
					value = chosen;
					changed("phone");
				}}
			>
				{written(value, kind, locale)}
			</button>
			{desk()}
			{self.name ? (
				<input type="hidden" name={self.name} value={iso(value, kind)} />
			) : null}
		</div>
	) as HTMLElement;
	return root;
}

type FieldProps = {
	header?: string;
	value?: Date;
	/** for a form: the value as yyyy-mm-dd (a date) or hh:mm (a time) */
	name?: string;
	/** whose way of writing dates (the browser's, if not said) */
	locale?: string;
	disabled?: boolean;
	onchange?: (value: Date) => void;
	class?: string;
} & Record<string, unknown>;

export function DatePicker(this: FC<FieldProps>) {
	return field(this, "date");
}

export function TimePicker(this: FC<FieldProps>) {
	return field(this, "time");
}

/** Open the date page on its own: the date chosen, or null if cancelled. */
export const pickDate = (value = new Date(), from: Element = document.body) =>
	pick("date", value, from);

/** Open the time page on its own: the time chosen, or null if cancelled. */
export const pickTime = (value = new Date(), from: Element = document.body) =>
	pick("time", value, from);
