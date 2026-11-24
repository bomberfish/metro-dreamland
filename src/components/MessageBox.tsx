import { swivelIn, swivelOut } from "../motion/text";
import { release } from "../motion/core";
import { openLayer } from "./layer";

// The phone's message box (the Windows Phone Toolkit's CustomMessageBox,
// which is the system's own, opened up): a band of the theme's chrome
// across the top of the screen, over the page dimmed to 60% of the
// background colour, swinging down into place from its top edge. A title
// in small semibold type, a caption in large semibold, the message in
// medium semilight, then up to two buttons side by side. Its content keeps
// to the phone's 480 pixels; on a screen wider than a phone the band is
// across the middle instead, as Windows 8's message dialogs were.
// Styles: "Message boxes" in controls.css.
//
// showMessageBox() opens one and settles with the index of the button
// pressed, or null if it was dismissed (Esc, or the back button's job:
// pressing off it).

export interface MessageBoxOptions {
	title?: string;
	caption?: string;
	message?: string;
	/** anything else, under the message (a check box, a text box...) */
	content?: Node;
	/** one or two (the toolkit's left and right buttons): "ok" if none */
	buttons?: string[];
	/** where it's opened from, for its theme */
	from?: Element | null;
	/** whether pressing off it dismisses it (it does) */
	light?: boolean;
}

export function showMessageBox(options: MessageBoxOptions): Promise<number | null> {
	const buttons = (options.buttons?.length ? options.buttons : ["ok"]).slice(0, 2);
	let result: number | null = null;
	const box = (
		<div class="m-msgbox" role="alertdialog" aria-modal="true">
			<div class="m-msgbox-inner">
				{options.title ? <p class="m-msgbox-title">{options.title}</p> : null}
				{options.caption ? (
					<p class="m-msgbox-caption">{options.caption}</p>
				) : null}
				{options.message ? (
					<p class="m-msgbox-message">{options.message}</p>
				) : null}
				{options.content ? (
					<div class="m-msgbox-content">{options.content}</div>
				) : null}
				<div class="m-msgbox-buttons" data-count={`${buttons.length}`}>
					{buttons.map((label, i) => (
						<button
							type="button"
							class="m-button"
							data-m-tilt
							on:click={() => {
								result = i;
								void layer.close();
							}}
						>
							{label}
						</button>
					))}
				</div>
			</div>
		</div>
	) as HTMLElement;
	const scrim = (<div class="m-msgbox-scrim" />) as HTMLElement;
	const layer = openLayer({
		class: "m-msgbox-layer",
		label: options.caption ?? options.title ?? "message",
		from: options.from,
		content: [scrim, box],
		light: options.light ?? true,
		enter: async () => {
			box.querySelector<HTMLElement>(".m-msgbox-buttons button")?.focus({
				preventScroll: true,
			});
			await swivelIn(box);
		},
		leave: async () => {
			await swivelOut(box);
			release(box);
		},
	});
	// (a press on the dimmed page is a press off the box)
	if (options.light ?? true)
		scrim.addEventListener("click", () => void layer.close());
	return layer.closed.then(() => result);
}
