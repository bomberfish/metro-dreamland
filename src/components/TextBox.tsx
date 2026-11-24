import { FC } from "dreamland/core";
import { classes, rest, transparent } from "./props";

// The phone's text box (Windows Phone 8's TextBox and PasswordBox, with
// the toolkit's PhoneTextBox's hint): a box of the theme's text box colour,
// light grey on the dark theme, that turns white with its border when it's
// being typed in, its text black and its selection the accent. A header
// over it in the subtle colour, as the toolkit's pickers had.
// Styles: "Text boxes" in controls.css.
//
// `type` is the <input>'s (text, password, email, search...); `lines` makes
// it a <textarea> of that many lines instead. `hint` is the placeholder.
// `readonly` and `disabled` are the template's two other looks.
export function TextBox(
	this: FC<
		{
			header?: string;
			name?: string;
			value?: string;
			hint?: string;
			type?: string;
			lines?: number;
			readonly?: boolean;
			disabled?: boolean;
			oninput?: (value: string) => void;
			onchange?: (value: string) => void;
			class?: string;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const field = {
		class: "m-textbox-input",
		name: this.name,
		...(this.hint ? { placeholder: this.hint } : {}),
		readonly: this.readonly ? true : undefined,
		disabled: this.disabled ? true : undefined,
		"aria-label": this.header ? undefined : this.hint,
		"on:input": (e: Event) =>
			this.oninput?.((e.currentTarget as HTMLInputElement).value),
		"on:change": (e: Event) =>
			this.onchange?.((e.currentTarget as HTMLInputElement).value),
	};
	return (
		<label
			class={classes("m-textbox", this.class)}
			{...rest(this, [
				"header",
				"name",
				"value",
				"hint",
				"type",
				"lines",
				"readonly",
				"disabled",
				"oninput",
				"onchange",
			])}
		>
			{this.header ? (
				<span class="m-header">{this.header}</span>
			) : null}
			{this.lines ? (
				<textarea rows={`${this.lines}`} {...field}>
					{this.value ?? ""}
				</textarea>
			) : (
				<input
					type={this.type ?? "text"}
					{...(this.value != null ? { value: this.value } : {})}
					{...field}
				/>
			)}
		</label>
	);
}

export default TextBox;
