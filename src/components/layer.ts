import { SSR } from "../motion/core";

// What the pickers, menus and message boxes open in: a modal <dialog>, so
// the browser keeps it above everything (the top layer), keeps focus in it
// while it's open, and gives it Esc. It fills the window and is clear: what
// shows is whatever the control draws in it. Styles: "Layers" in
// controls.css.
//
// The theme, accent and material of wherever it was opened from come with
// it (data-m-theme, data-m-accent, data-m-material), since a <dialog> is
// put at the end of the <body>, outside whatever said them.

export interface Layer {
	dialog: HTMLDialogElement;
	/** Play the way out (the control's own `leave`), then remove it. */
	close: () => Promise<void>;
	/** Settles once it's gone, however it went. */
	closed: Promise<void>;
}

export interface LayerOptions {
	/** its class, besides m-layer */
	class: string;
	/** what a screen reader calls it */
	label: string;
	/** what's in it */
	content: Node | Node[];
	/** where it was opened from, for its theme (and focus goes back there) */
	from?: Element | null;
	/** the way in, once it's on screen */
	enter?: (dialog: HTMLDialogElement) => Promise<unknown> | unknown;
	/** the way out, before it's taken away */
	leave?: (dialog: HTMLDialogElement) => Promise<unknown> | unknown;
	/** Esc, or a press on the dialog itself (not on what's in it), closes it */
	light?: boolean;
	/** Called as it starts to close, however that came about. */
	onclose?: () => void;
}

const CARRIED = ["data-m-theme", "data-m-accent", "data-m-material"];

export function openLayer(options: LayerOptions): Layer {
	if (SSR) throw new Error("metro-dreamland: a layer can't open on the server");
	const dialog = document.createElement("dialog");
	dialog.className = `m-layer ${options.class}`;
	dialog.setAttribute("aria-label", options.label);
	for (const name of CARRIED) {
		const value = options.from?.closest(`[${name}]`)?.getAttribute(name);
		if (value) dialog.setAttribute(name, value);
	}
	dialog.append(...([] as Node[]).concat(options.content));
	const before = document.activeElement as HTMLElement | null;
	document.body.append(dialog);
	dialog.showModal();

	let done: () => void = () => {};
	const closed = new Promise<void>((resolve) => (done = resolve));
	let closing: Promise<void> | null = null;
	const close = () =>
		(closing ??= (async () => {
			options.onclose?.();
			try {
				await options.leave?.(dialog);
			} finally {
				dialog.close();
				dialog.remove();
				before?.focus?.({ preventScroll: true });
				done();
			}
		})());

	dialog.addEventListener("cancel", (e) => {
		e.preventDefault();
		if (options.light !== false) void close();
	});
	if (options.light !== false)
		dialog.addEventListener("click", (e) => {
			if (e.target === dialog) void close();
		});
	void options.enter?.(dialog);
	return { dialog, close, closed };
}
