import { ComponentChild, FC } from "dreamland/core";
import { norm, pivotPaths } from "../motion/core";
import Link from "./Link";
import type { PivotItem } from "./Pivot";
import { classes, rest, transparent } from "./props";

// A sidebar: the other way Windows 8 laid out an app's sections, as its PC
// settings did. A pane down the left, in the theme's chrome, with the app's
// title at the top in the accent colour and the sections listed under it;
// the one that's open filled with the accent, edge to edge. What's in it is
// beside the pane, and scrolls on its own while the pane stays put.
//
// It's the pivot's alternative for a tablet or desktop: the same `items`
// and `active`, each section a page of its own, and going between them is
// the pivot's kind of change (data-m-nav="pivot"): the pane stays, the
// light moves to the section picked, and the content changes as Windows
// 8's did, WinJS's exitContent and enterContent (./motion/transitions.ts).
// On a phone, where there isn't room for it, use a <Pivot>: the pane goes
// above the content there, as a plain list.
//
// Measures from a screenshot of Windows 8's PC settings: the title is the
// Header style (56px, light, its baseline 100px down), the sections the
// Subheader style (26.667px, semilight) in rows 53px tall, the pane about
// 500px wide, the light theme's #f4f4f4.
export function NavPane(
	this: FC<
		{
			title: string;
			items: PivotItem[];
			active: string;
			label?: string;
			class?: string;
			children?: ComponentChild;
		} & Record<string, unknown>
	>
) {
	transparent(this);
	// (these pages are one place, as far as going back is concerned)
	for (const item of this.items) pivotPaths.add(norm(item.href));

	return (
		<div
			class={classes("m-navpane-layout", this.class)}
			{...rest(this, ["title", "items", "active", "label"])}
		>
			<nav
				class="m-navpane"
				aria-label={this.label ?? "sections"}
				data-m-pivot="pane"
				data-m-static
			>
				<p class="m-navpane-title">{this.title}</p>
				{this.items.map((item, i) =>
					item.href === this.active ? (
						<Link
							href={item.href}
							class="m-navpane-item"
							data-m-nav="pivot"
							data-m-i={`${i}`}
							aria-current="page"
						>
							{item.label}
						</Link>
					) : (
						<Link
							href={item.href}
							class="m-navpane-item"
							data-m-nav="pivot"
							data-m-i={`${i}`}
						>
							{item.label}
						</Link>
					)
				)}
			</nav>
			<div class="m-navpane-content" data-m-content>
				{this.children}
			</div>
		</div>
	);
}

export default NavPane;
