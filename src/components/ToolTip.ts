import { SSR, still } from "../motion/core";

// Windows 8's tooltip (its ToolTip control's default template: the phone
// had none): a white box with a grey edge and grey type in the small size,
// the same in both themes, over what it's about. It comes after the pointer
// has rested on something a moment, or when the keyboard gets there, and
// goes as soon as either leaves. Styles: "Tooltips" in controls.css.
//
// Anything with data-m-tip="…" has one: startMetro() starts them, or
// startToolTips() on its own.

/** How long the pointer rests before it shows (Windows' hover time). */
export const TIP_DELAY_MS = 400;

let started = false;

export function startToolTips() {
	if (SSR || started) return;
	started = true;
	const tip = document.createElement("div");
	tip.className = "m-tip";
	tip.setAttribute("role", "tooltip");
	tip.id = "m-tip";
	let timer = 0;
	let owner: HTMLElement | null = null;

	const hide = () => {
		clearTimeout(timer);
		owner?.removeAttribute("aria-describedby");
		owner = null;
		tip.remove();
	};
	const show = (el: HTMLElement) => {
		owner = el;
		tip.textContent = el.dataset.mTip ?? "";
		el.setAttribute("aria-describedby", tip.id);
		// (in the top layer if a dialog's open, or it would be under it)
		(document.querySelector("dialog[open]") ?? document.body).append(tip);
		const r = el.getBoundingClientRect();
		const t = tip.getBoundingClientRect();
		const gap = 8;
		let top = r.top - t.height - gap;
		if (top < 4) top = r.bottom + gap;
		const left = Math.max(
			4,
			Math.min(r.left + r.width / 2 - t.width / 2, innerWidth - t.width - 4)
		);
		tip.style.left = `${left}px`;
		tip.style.top = `${top}px`;
		if (!still())
			tip.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 100 });
	};
	const soon = (el: HTMLElement) => {
		clearTimeout(timer);
		timer = window.setTimeout(() => show(el), TIP_DELAY_MS);
	};

	addEventListener("pointerover", (e) => {
		if (e.pointerType === "touch") return;
		const el = (e.target as Element).closest<HTMLElement>("[data-m-tip]");
		if (el === owner) return;
		hide();
		if (el) soon(el);
	});
	addEventListener("pointerdown", hide, true);
	addEventListener("focusin", (e) => {
		const el = (e.target as Element).closest<HTMLElement>("[data-m-tip]");
		hide();
		if (el && el.matches(":focus-visible")) soon(el);
	});
	addEventListener("focusout", hide);
	addEventListener("keydown", (e) => {
		if (e.key === "Escape") hide();
	});
	addEventListener("scroll", hide, true);
}
