import { ComponentChild, FC } from "dreamland/core";
import { norm, pivotPaths } from "../motion/core";
import Link from "./Link";
import { classes, rest, transparent } from "./props";

// The pivot: a page's title, followed on the same line by the other pages
// of its kind, dimmed and running off the edge of the screen. Picking one
// slides it to the front (the "pivot" transition, motion/transitions.ts).
// `items` are all of them in their fixed order and `active` the href of the
// one this page is: the strip starts there and goes round.
//
// The page it's on is a <Page kind="pivot">, and what slides in under the
// strip is marked data-m-content.
//
// That's the phone's. On a tablet or desktop (the form factor: see
// formfactor.ts) there's room for more, and the strip does what WinJS's
// Pivot did there (winjs/winjs, Controls/Pivot/_Pivot.ts: "static" and
// "overflow" modes). If every header fits, they stand in their fixed order,
// the current one lit, like tabs, and don't move as the page changes: the
// one picked lights up, the last one dims, and only the content slides. If
// they don't fit, it's the phone's strip, starting at the current one; and
// for a mouse there are two buttons at its ends (shown while the pointer is
// over the strip) to step to the section before or after. settlePivots()
// (./motion/pivot.ts) works out which, as a page arrives and as the window
// changes; each header knows its place in the order (data-m-i) for it.
export interface PivotItem {
	href: string;
	label: string;
}

export function Pivot(
	this: FC<
		{
			items: PivotItem[];
			active: string;
			label?: string;
			class?: string;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	const at = Math.max(
		0,
		this.items.findIndex((item) => item.href === this.active)
	);
	const rest_ = [...this.items.slice(at + 1), ...this.items.slice(0, at)];
	// (these pages are one place, as far as going back is concerned)
	for (const item of this.items) pivotPaths.add(norm(item.href));

	return (
		<nav
			class={classes("pivot", this.class)}
			aria-label={this.label ?? "sections"}
			data-m-pivot
			{...rest(this, ["items", "active", "label"])}
		>
			<h1 aria-current="page" data-m-i={`${at}`}>
				{this.items[at]?.label}
			</h1>
			{rest_.map((item) => (
				<Link
					href={item.href}
					class="pivot-item"
					data-m-nav="pivot"
					data-m-i={`${this.items.indexOf(item)}`}
				>
					{item.label}
				</Link>
			))}
			{/* (WinJS's: for a mouse, when the headers don't all fit) */}
			<button
				type="button"
				class="m-pivot-nav m-pivot-prev"
				aria-label="previous section"
				tabindex="-1"
				data-m-pivot-step="-1"
			/>
			<button
				type="button"
				class="m-pivot-nav m-pivot-next"
				aria-label="next section"
				tabindex="-1"
				data-m-pivot-step="1"
			/>
		</nav>
	);
}

/**
 * A page's header: its giant lowercase title (an <h1>, or a <Pivot>) and
 * whatever goes under it.
 */
export function PageHeader(
	this: FC<
		{ class?: string; children?: ComponentChild } & Record<string, unknown>
	>
) {
	transparent(this);
	return (
		<div class={classes("page-header", this.class)} {...rest(this)}>
			{this.children}
		</div>
	);
}

export default Pivot;
