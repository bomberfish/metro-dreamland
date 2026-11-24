// The phone's own easing functions, as CSS.
//
// Silverlight and WinRT eased nearly everything with ExponentialEase, and a
// cubic-bezier() can only approximate one. This writes the real curve out
// as a CSS linear() easing: enough stops along it that the straight lines
// between them can't be told from it. (linear() is in every browser since
// 2023; where it isn't, the browser drops the easing and the motion runs
// at an even pace, which is still the right motion.)
//
// ExponentialEase, as WPF and WinRT define it, for exponent k:
//   in:     f(t) = (e^(k t) - 1) / (e^k - 1)
//   out:    1 - f(1 - t)
//   in-out: f(2t) / 2 for the first half, 1 - f(2 - 2t) / 2 for the second

export type EaseMode = "in" | "out" | "in-out";

const cache = new Map<string, string>();

function expIn(t: number, k: number) {
	return k === 0 ? t : (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
}

/** WinRT's ExponentialEase (exponent 2 is its default) as a CSS easing. */
export function exponential(mode: EaseMode, exponent = 2, stops = 24): string {
	const key = `${mode}:${exponent}:${stops}`;
	const known = cache.get(key);
	if (known) return known;
	const at = (t: number) =>
		mode === "in"
			? expIn(t, exponent)
			: mode === "out"
				? 1 - expIn(1 - t, exponent)
				: t < 0.5
					? expIn(2 * t, exponent) / 2
					: 1 - expIn(2 - 2 * t, exponent) / 2;
	const points: string[] = [];
	for (let i = 0; i <= stops; i++) {
		const t = i / stops;
		points.push(at(t).toFixed(4));
	}
	const css = `linear(${points.join(", ")})`;
	cache.set(key, css);
	return css;
}
