import { ComponentChild, FC } from "dreamland/core";
import { classes, rest, transparent } from "./props";

// The phone's check box and radio button (Windows Phone 8's default
// templates, PhoneRadioButtonCheckBoxBase): a 32-pixel box (a circle, for a
// radio button) filled and edged in the theme's check colour, a black tick
// (a dot) in it, and the label 12 pixels off in the medium size. Pressed,
// the box lights up white. Styles: "Check boxes and radio buttons" in
// controls.css.
//
// That's on a phone. Anywhere else they're Windows 8's: a 21-pixel box (a
// 23-pixel circle), 80% white and no edge, with its own smaller tick (a
// 13-pixel dot), the label beside it at the control size (14.667).
//
// Under each is the real <input>, so the keys, forms and screen readers
// are the browser's own. Like the toggle switch, a hydrated one doesn't
// follow state: set its input's `checked` to move it from outside.

type Common = {
	name?: string;
	value?: string;
	checked?: boolean;
	disabled?: boolean;
	onchange?: (checked: boolean) => void;
	class?: string;
	children?: ComponentChild;
} & Record<string, unknown>;

const OWN = ["name", "value", "checked", "disabled", "onchange", "indeterminate"];

// The tick: the template's own path, stretched to 23 x 21 as it was; and
// Windows 8's (its CheckBox's CheckGlyph, 16 x 14), for a tablet or desktop.
const TICK = "M0,123 L39,93 L124,164 L256,18 L295,49 L124,240 z";
const TICK_8 = "M 0,58 L 2,56 L 6,60 L 13,51 L 15,53 L 6,64 z";

export function CheckBox(this: FC<Common & { indeterminate?: boolean }>) {
	transparent(this);
	return (
		<label
			class={classes("m-check", this.class)}
			{...rest(this, OWN)}
		>
			<input
				type="checkbox"
				name={this.name}
				{...(this.value != null ? { value: this.value } : {})}
				checked={this.checked ? true : undefined}
				disabled={this.disabled ? true : undefined}
				data-indeterminate={this.indeterminate ? "" : undefined}
				on:change={(e: Event) =>
					this.onchange?.((e.currentTarget as HTMLInputElement).checked)
				}
			/>
			<span class="m-check-box" aria-hidden="true">
				<svg class="m-tick-phone" viewBox="0 0 295 240" preserveAspectRatio="none">
					<path d={TICK} />
				</svg>
				<svg class="m-tick-8" viewBox="0 51 15 13" preserveAspectRatio="none">
					<path d={TICK_8} />
				</svg>
			</span>
			<span class="m-check-label">{this.children}</span>
		</label>
	);
}

export function RadioButton(this: FC<Common>) {
	transparent(this);
	return (
		<label class={classes("m-check m-radio", this.class)} {...rest(this, OWN)}>
			<input
				type="radio"
				name={this.name}
				{...(this.value != null ? { value: this.value } : {})}
				checked={this.checked ? true : undefined}
				disabled={this.disabled ? true : undefined}
				on:change={(e: Event) =>
					this.onchange?.((e.currentTarget as HTMLInputElement).checked)
				}
			/>
			<span class="m-check-box" aria-hidden="true" />
			<span class="m-check-label">{this.children}</span>
		</label>
	);
}

/**
 * Check boxes start indeterminate only by script (there's no attribute for
 * it): this puts the ones that asked for it (data-indeterminate) that way.
 * startMetro() runs it over the page; run it again for ones drawn later.
 */
export function settleCheckBoxes(root: ParentNode = document) {
	for (const input of root.querySelectorAll<HTMLInputElement>(
		".m-check input[data-indeterminate]"
	)) {
		input.indeterminate = true;
		input.removeAttribute("data-indeterminate");
	}
}

export default CheckBox;
