import { FC } from "dreamland/core";
import { exponential } from "../motion/ease";
import { EASE_OUT, isPhone, still } from "../motion/core";
import { showMenuFlyout } from "./ContextMenu";
import { classes, rest, transparent } from "./props";

// The phone's app bar (Windows Phone 8's ApplicationBar, as Windows Phone
// 8.1's shell drew it): a strip of the theme's chrome along the foot of the
// page, with up to four round command buttons in the middle and the
// ellipsis at the right. The ellipsis opens it: the strip rises to show
// each button's label under it and the menu's items in large light type
// under those. Pressing a command, or anywhere off the bar, closes it.
// `minimal` is the bar as just the ellipsis, a thin strip, until it's
// opened. Styles: "The app bar" in controls.css.
//
// The measures are the shell's, as Cornflower read them off a Windows
// Phone 8.1 device frame by frame (github.com/wdcossey/Cornflower,
// docs/controls/CommandBar/PLAN.md): the bar 62.92 tall closed, circles
// 40.75 across in slots 73.75 wide, labels 11.67 semibold, menu lines 59.17
// apart in 27.92 semilight; its open heights step with the number of menu
// lines; it opens on an exponential ease-out (exponent 4.5) over 420ms and
// closes on another (5.5) over 200ms. A pressed command fills with the
// accent and sinks a little; a disabled one is 45% there.
//
// The bar sits fixed at the foot of the window: leave room under the page
// for it (--m-appbar-h, which it sets on <html> while it's there, is how
// tall it is closed).
//
// That's on a phone. Anywhere else it's Windows 8.1's app bar: black (on
// the light theme, a pale grey) with an edge of the same along its top, 68
// pixels tall, its commands at the right, each a 40-pixel ring with its
// label always under it in 12-pixel type, 100 pixels a command; the menu's
// items behind a "more" command at the left, in a menu flyout. It's out
// of sight until it's called for, as Windows 8's were: a right-click on
// the page (not on something with a menu of its own) brings it up from the
// foot, and a press anywhere else, or Esc, sends it back. `pinned` keeps it
// up (an app bar that's sticky and open).

export interface AppBarButton {
	/** what's in the circle: an icon font's ligature or codepoint */
	icon: string;
	label: string;
	onclick?: () => void;
	disabled?: boolean;
}

export interface AppBarMenuItem {
	label: string;
	onclick?: () => void;
	disabled?: boolean;
}

// the open bar's height, by menu lines (none, one, two or three, four or
// more): the shell's steps
const OPEN = [89.17, 167.5, 285.42, 285.42, 418.75];
const CLOSED = { compact: 62.92, minimal: 26.25 };

export function AppBar(
	this: FC<
		{
			buttons?: AppBarButton[];
			menu?: AppBarMenuItem[];
			mode?: "compact" | "minimal";
			/** where it is: the window's foot (fixed), or its container's (absolute) */
			position?: "fixed" | "absolute";
			/** on a tablet or desktop, always up (sticky and open) */
			pinned?: boolean;
			class?: string;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const pinned = !!this.pinned;
	const buttons = (this.buttons ?? []).slice(0, 4);
	const menu = this.menu ?? [];
	const mode = this.mode ?? "compact";
	const lines = Math.min(menu.length, 4);
	const openH = OPEN[lines];
	const closedH = CLOSED[mode];
	let root: HTMLElement;

	const bar = () => root.querySelector<HTMLElement>(".m-appbar-bar")!;
	const set = (open: boolean, keys = false) => {
		if (root.hasAttribute("data-open") === open) return;
		const b = bar();
		b.style.transition = still()
			? "none"
			: !isPhone()
				? `transform 270ms ${EASE_OUT}`
				: open
					? `transform 420ms ${exponential("out", 4.5)}`
					: `transform 200ms ${exponential("out", 5.5)}`;
		root.toggleAttribute("data-open", open);
		root
			.querySelector(".m-appbar-more")
			?.setAttribute("aria-expanded", `${open}`);
		// (from the keyboard, into what it's opened: the first command)
		if (open && keys)
			root
				.querySelector<HTMLElement>(
					".m-appbar-menu button, .m-appbar-button:not(:disabled)"
				)
				?.focus({ preventScroll: true });
	};
	const run = (action?: () => void) => () => {
		set(false);
		action?.();
	};

	root = (
		<div
			class={classes("m-appbar", `m-appbar-${mode}`, this.class)}
			data-position={this.position ?? "fixed"}
			data-pinned={this.pinned ? "" : undefined}
			style={`--open-h: ${openH}px; --closed-h: ${closedH}px`}
			{...rest(this, ["buttons", "menu", "mode", "position", "pinned"])}
			on:keydown={(e: KeyboardEvent) => {
				if (e.key === "Escape" && root.hasAttribute("data-open")) {
					e.stopPropagation();
					set(false);
					root.querySelector<HTMLElement>(".m-appbar-more")?.focus();
				}
			}}
		>
			<div class="m-appbar-scrim" on:click={() => set(false)} />
			<div
				class="m-appbar-bar"
				role="toolbar"
				on:click={(e: Event) => {
					// (the minimal bar opens on a press anywhere on it)
					if (
						mode === "minimal" &&
						!root.hasAttribute("data-open") &&
						!(e.target as Element).closest("button")
					)
						set(true);
				}}
			>
				{/* (Windows 8.1's: the menu behind a command of its own) */}
				{menu.length ? (
					<div class="m-appbar-secondary">
						<button
							type="button"
							class="m-appbar-button m-appbar-overflow"
							aria-label="more"
							aria-haspopup="menu"
							on:click={(e: Event) =>
								void showMenuFlyout(
									e.currentTarget as Element,
									menu.map((m) => ({
										label: m.label,
										disabled: m.disabled,
										onclick: run(m.onclick),
									}))
								)
							}
						>
							<span class="m-appbar-ring">
								<span class="material-symbols" aria-hidden="true">
									{"\uE10C"}
								</span>
							</span>
							<span class="m-appbar-label" aria-hidden="true">
								more
							</span>
						</button>
					</div>
				) : null}
				<div class="m-appbar-buttons">
					{buttons.map((b) => (
						<button
							type="button"
							class="m-appbar-button"
							aria-label={b.label}
							disabled={b.disabled ? true : undefined}
							on:click={run(b.onclick)}
						>
							<span class="m-appbar-ring">
								<span class="material-symbols" aria-hidden="true">
									{b.icon}
								</span>
							</span>
							<span class="m-appbar-label" aria-hidden="true">
								{b.label}
							</span>
						</button>
					))}
				</div>
				<button
					type="button"
					class="m-appbar-more"
					aria-label="more"
					aria-expanded="false"
					on:click={(e: MouseEvent) =>
						set(!root.hasAttribute("data-open"), e.detail === 0)
					}
				>
					<i />
					<i />
					<i />
				</button>
				{menu.length ? (
					<ul class="m-appbar-menu">
						{menu.map((item) => (
							<li>
								<button
									type="button"
									data-m-tilt
									disabled={item.disabled ? true : undefined}
									on:click={run(item.onclick)}
								>
									{item.label}
								</button>
							</li>
						))}
					</ul>
				) : null}
			</div>
		</div>
	) as HTMLElement;

	// (room for it under the page, while it's on one)
	if ((this.position ?? "fixed") === "fixed" && typeof document !== "undefined") {
		const cx = this.cx as { mount?: () => void } | undefined;
		if (cx)
			cx.mount = () => {
				document.documentElement.style.setProperty(
					"--m-appbar-h",
					`${closedH}px`
				);
				// (Windows 8's: a right-click on the page calls it up; not on
				// a field, a link, or anything with a menu of its own)
				if (pinned) return;
				addEventListener("contextmenu", (e) => {
					if (isPhone() || !root.isConnected) return;
					const t = e.target as Element;
					if (
						t.closest(
							"a, input, textarea, select, [contenteditable], .m-menu-owner, dialog, .m-appbar"
						)
					)
						return;
					e.preventDefault();
					set(!root.hasAttribute("data-open"));
				});
			};
	}
	return root;
}

export default AppBar;
