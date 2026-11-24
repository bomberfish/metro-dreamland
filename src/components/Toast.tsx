import { swivelIn, swivelOut } from "../motion/text";
import { EASE_IN, EASE_OUT, isPhone, release, SSR, still } from "../motion/core";

// The phone's toast (Windows Phone 8's toast notification): a strip in the
// accent colour across the top of the screen, swinging down into view from
// its top edge, with the app's small icon, the title in semibold and the
// message after it on the same line. It stays ten seconds; a tap does what
// it's for, and a flick to the right sends it away. One at a time: a
// second waits for the first to go. Styles: "Toasts" in controls.css.
//
// That's on a phone. Anywhere else it's Windows 8's: a box at the top
// right of the screen, coming in from the right edge, the title over the
// message; it stays seven seconds (Windows 8's short toast).

export interface ToastOptions {
	title: string;
	message?: string;
	/** a small icon before the title: an icon font's ligature or codepoint */
	icon?: string;
	/** what a tap on it does (it goes away either way) */
	onclick?: () => void;
	/** how long it stays, in ms (10 seconds on a phone, 7 elsewhere) */
	duration?: number;
}

let queue: Promise<void> = Promise.resolve();

export function showToast(options: ToastOptions): Promise<void> {
	if (SSR) return Promise.resolve();
	const turn = queue.then(() => run(options));
	queue = turn.catch(() => {});
	return turn;
}

function run(options: ToastOptions): Promise<void> {
	const el = (
		<div class="m-toast" role="status" aria-live="polite">
			{options.icon ? (
				<span class="m-toast-icon material-symbols" aria-hidden="true">
					{options.icon}
				</span>
			) : null}
			<span class="m-toast-text">
				<strong class="m-toast-title">{options.title}</strong>
				{options.message ? (
					<span class="m-toast-message">{options.message}</span>
				) : null}
			</span>
		</div>
	) as HTMLElement;
	document.body.append(el);

	return new Promise<void>((resolve) => {
		let gone = false;
		const away = async (flick = false) => {
			if (gone) return;
			gone = true;
			clearTimeout(timer);
			if (flick) {
				await el.animate?.(
					[
						{ transform: el.style.transform || "translateX(0)" },
						{ transform: `translateX(${innerWidth}px)` },
					],
					{ duration: 200, easing: "cubic-bezier(0.7, 0, 1, 0.5)", fill: "forwards" }
				).finished;
			} else if (!phone) {
				el.style.transform = "";
				if (!still())
					await el.animate?.(
						[{ transform: "none", opacity: 1 }, { transform: "translateX(100%)", opacity: 0 }],
						{ duration: 200, easing: EASE_IN, fill: "forwards" }
					).finished;
			} else {
				el.style.transform = "";
				await swivelOut(el);
			}
			release(el);
			el.remove();
			resolve();
		};
		const phone = isPhone();
		const timer = window.setTimeout(
			() => void away(),
			options.duration ?? (phone ? 10000 : 7000)
		);

		// a flick to the right
		let from: number | null = null;
		let moved = 0;
		el.addEventListener("pointerdown", (e) => {
			from = e.clientX;
			moved = 0;
			el.setPointerCapture(e.pointerId);
		});
		el.addEventListener("pointermove", (e) => {
			if (from === null) return;
			moved = Math.max(0, e.clientX - from);
			el.style.transform = `translateX(${moved}px)`;
		});
		const up = () => {
			if (from === null) return;
			from = null;
			if (moved > el.offsetWidth * 0.3) void away(true);
			else if (moved > 8) el.style.transform = "";
			else {
				el.style.transform = "";
				options.onclick?.();
				void away();
			}
		};
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", () => {
			from = null;
			el.style.transform = "";
		});

		if (phone) void swivelIn(el);
		else if (!still())
			el.animate?.(
				[{ transform: "translateX(100%)" }, { transform: "none" }],
				{ duration: 300, easing: EASE_OUT }
			);
	});
}
