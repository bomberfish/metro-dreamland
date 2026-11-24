// The form factor: whether the controls are the phone's (Windows Phone 8's
// and its toolkit's) or Windows 8's (a tablet's, a desktop's). It's an
// attribute on <html>, data-m-form-factor="phone" or "desktop", which
// controls.css reads, and isPhone() for what the controls do.
//
// "auto", unless the app (or the visitor) says otherwise: the phone's
// where the window is narrow, or short and touched (a phone on its side),
// following the window as it changes (PHONE_QUERY). Forcing one is
// remembered on the device (localStorage, "m-form-factor"), as the
// material is.
//
// To have it in place before the first paint (a page from the server),
// set the attribute in a script in the <head>, as the README shows;
// startMetro() sets it either way.

import { PHONE_QUERY, root, SSR } from "./core";

export type FormFactor = "phone" | "desktop";
export type FormFactorChoice = FormFactor | "auto";

const KEY = "m-form-factor";
const ATTR = "data-m-form-factor";

let chosen: FormFactorChoice = "auto";
let query: MediaQueryList | null = null;

const known = (value: unknown): value is FormFactorChoice =>
	value === "phone" || value === "desktop" || value === "auto";

function apply() {
	if (SSR) return;
	const value: FormFactor =
		chosen === "auto" ? (query?.matches ? "phone" : "desktop") : chosen;
	if (root().getAttribute(ATTR) === value) return;
	root().setAttribute(ATTR, value);
	dispatchEvent(new CustomEvent("m-form-factor", { detail: value }));
}

/** The form factor in use. */
export function formFactor(): FormFactor {
	if (SSR) return "desktop";
	return root().getAttribute(ATTR) === "phone" ? "phone" : "desktop";
}

/** What's been chosen: one of the two, or "auto" (the window decides). */
export const formFactorChoice = (): FormFactorChoice => chosen;

/** Use `value` from here on, and (unless told not to) next time too. */
export function setFormFactor(value: FormFactorChoice, remember = true) {
	if (SSR) return;
	chosen = value;
	apply();
	if (!remember) return;
	try {
		if (value === "auto") localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, value);
	} catch {
		// (nowhere to keep it: it lasts as long as the page does)
	}
}

/** What was chosen last time, or `fallback`: put in place, and kept up. */
export function startFormFactor(fallback: FormFactorChoice = "auto") {
	if (SSR || query) return;
	query = matchMedia(PHONE_QUERY);
	query.addEventListener("change", apply);
	let stored: unknown = null;
	try {
		stored = localStorage.getItem(KEY);
	} catch {
		// (no storage)
	}
	chosen = known(stored) ? stored : fallback;
	apply();
}
