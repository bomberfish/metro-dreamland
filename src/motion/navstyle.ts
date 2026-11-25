// How an app's sections are got to: a pivot (the phone's, and a tablet's
// or desktop's strip of headers) or a sidebar (Windows 8's PC settings: a
// pane of them down the left). Which one is the app's to say, for each
// kind of device and each way up, and the person using it can say
// otherwise; <Sections> (../components/Sections.tsx) draws whichever it
// comes to, and changes over when it changes.
//
// The kind of device, its "idiom":
//
//   phone     the phone's form factor (./formfactor.ts: a narrow window, or
//             a short one that's touched; or forced)
//   tablet    otherwise, where the main pointer is a finger
//   desktop   otherwise: a mouse or a trackpad
//
// and which way up the window is, "portrait" (as tall as it's wide, or
// taller) or "landscape". Both are on <html> too, data-m-idiom and
// data-m-orientation, with the outcome, data-m-navigation.
//
// The rules (MetroConfig.navigation, or setNavigation()): one style for
// everything, or one for each idiom, each of those one style or one for
// each orientation. Whatever's left out is a pivot:
//
//   navigation: "sidebar"
//   navigation: {
//     tablet: { landscape: "sidebar", portrait: "pivot" },
//     desktop: "sidebar",
//   }
//
// What the person using the app chooses (setNavigation) takes the place of
// the app's rules, and is remembered on the device (localStorage,
// "m-navigation"), as the form factor and the material are.

import { config, root, SSR } from "./core";
import { formFactor } from "./formfactor";

export type NavigationStyle = "pivot" | "sidebar";
export type Idiom = "phone" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";
export type NavigationRule =
	| NavigationStyle
	| Partial<Record<Orientation, NavigationStyle>>;
export type NavigationRules =
	| NavigationRule
	| Partial<Record<Idiom, NavigationRule>>;

const KEY = "m-navigation";
const IDIOMS: Idiom[] = ["phone", "tablet", "desktop"];
const ORIENTATIONS: Orientation[] = ["portrait", "landscape"];

let chosen: NavigationRules | null = null;
let started = false;
let touchQuery: MediaQueryList | null = null;
let portraitQuery: MediaQueryList | null = null;

const isStyle = (v: unknown): v is NavigationStyle =>
	v === "pivot" || v === "sidebar";

const isRule = (v: unknown): v is NavigationRule =>
	isStyle(v) ||
	(!!v &&
		typeof v === "object" &&
		!Array.isArray(v) &&
		Object.entries(v).every(
			([k, s]) => (ORIENTATIONS as string[]).includes(k) && isStyle(s)
		));

/** Whether `v` is a set of rules this understands (for what's stored). */
export const isNavigationRules = (v: unknown): v is NavigationRules =>
	isRule(v) ||
	(!!v &&
		typeof v === "object" &&
		!Array.isArray(v) &&
		Object.entries(v).every(
			([k, r]) => (IDIOMS as string[]).includes(k) && isRule(r)
		));

/** The kind of device (see the top). */
export function idiom(): Idiom {
	if (SSR) return "desktop";
	if (formFactor() === "phone") return "phone";
	return touchQuery?.matches ?? matchMedia("(pointer: coarse)").matches
		? "tablet"
		: "desktop";
}

/** Which way up the window is. */
export function orientation(): Orientation {
	if (SSR) return "landscape";
	return portraitQuery?.matches ??
		matchMedia("(orientation: portrait)").matches
		? "portrait"
		: "landscape";
}

/** What `rules` come to for one idiom, one way up. */
export function resolveNavigation(
	rules: NavigationRules,
	on: Idiom,
	way: Orientation
): NavigationStyle {
	const pick = (rule: NavigationRule | undefined): NavigationStyle =>
		rule === undefined
			? "pivot"
			: isStyle(rule)
				? rule
				: (rule[way] ?? "pivot");
	if (isStyle(rules)) return rules;
	const keys = Object.keys(rules);
	// (rules by orientation alone, for every idiom)
	if (keys.length && keys.every((k) => (ORIENTATIONS as string[]).includes(k)))
		return pick(rules as NavigationRule);
	return pick((rules as Partial<Record<Idiom, NavigationRule>>)[on]);
}

/** The rules in force: the person's, if they've chosen, or the app's. */
export const navigationRules = (): NavigationRules =>
	chosen ?? config.navigation;

/** Whether the person using the app has chosen (setNavigation). */
export const navigationChosen = () => chosen !== null;

/** The style in use now, here. */
export function navigation(): NavigationStyle {
	return resolveNavigation(navigationRules(), idiom(), orientation());
}

function apply() {
	if (SSR) return;
	const el = root();
	const on = idiom();
	const way = orientation();
	const style = resolveNavigation(navigationRules(), on, way);
	const was = el.getAttribute("data-m-navigation");
	el.setAttribute("data-m-idiom", on);
	el.setAttribute("data-m-orientation", way);
	el.setAttribute("data-m-navigation", style);
	if (was !== style)
		dispatchEvent(new CustomEvent("m-navigation", { detail: style }));
}

/**
 * The person's own rules (see the top), from here on and (unless told not
 * to) next time too; or null to go back to the app's.
 */
export function setNavigation(rules: NavigationRules | null, remember = true) {
	if (SSR) return;
	chosen = rules;
	apply();
	if (!remember) return;
	try {
		if (rules === null) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(rules));
	} catch {
		// (nowhere to keep it: it lasts as long as the page does)
	}
}

/** What was chosen last time put back, and the outcome kept up to date. */
export function startNavigation() {
	if (SSR || started) return;
	started = true;
	try {
		const stored = JSON.parse(localStorage.getItem(KEY) ?? "null");
		if (isNavigationRules(stored)) chosen = stored;
	} catch {
		// (nothing kept, or not something this understands)
	}
	touchQuery = matchMedia("(pointer: coarse)");
	portraitQuery = matchMedia("(orientation: portrait)");
	touchQuery.addEventListener("change", apply);
	portraitQuery.addEventListener("change", apply);
	addEventListener("m-form-factor", apply);
	addEventListener("m-configure", apply);
	apply();
}
