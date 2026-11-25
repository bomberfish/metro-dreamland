import { ComponentChild, FC } from "dreamland/core";
import {
	navigation,
	type NavigationStyle,
} from "../motion/navstyle";
import NavPane from "./NavPane";
import { PageHeader, Pivot, type PivotItem } from "./Pivot";
import { classes, rest, transparent } from "./props";

// A section of an app with several, drawn the way the app has said its
// sections are got to on this kind of device, this way up (../motion/
// navstyle.ts: MetroConfig.navigation, or the person's own choice,
// setNavigation): a pivot, the app's title in capitals over a strip of
// the sections' names, or a sidebar, Windows 8's PC settings' pane
// (<NavPane>). It changes from one to the other as that does (the window
// turned on its side, say), keeping what's in it as it is.
//
// Each section is a page of its own, a <Page kind="pivot"> with one of
// these in it, as with a <Pivot>:
//
//   <Page kind="pivot">
//     <Sections title="mail" items={SECTIONS} active="/inbox">
//       …the inbox…
//     </Sections>
//   </Page>
//
// The root says which it is (data-m-navigation="pivot" or "sidebar") for
// the app's own styles: the pivot's room round it, say, which a sidebar,
// running to the window's edges, doesn't want.
export function Sections(
	this: FC<
		{
			title: string;
			items: PivotItem[];
			active: string;
			label?: string;
			class?: string;
			children?: ComponentChild;
		} & Record<string, unknown>,
		{ style: NavigationStyle }
	>
) {
	transparent(this);
	this.style = navigation();
	// (one, moved from one layout to the other: what's in it stays as it is)
	const content = (
		<div class="m-sections-content">{this.children}</div>
	) as HTMLElement;

	this.cx.mount = () => {
		const follow = () => {
			if (!this.root?.isConnected) {
				removeEventListener("m-navigation", follow);
				return;
			}
			this.style = navigation();
		};
		addEventListener("m-navigation", follow);
	};

	return (
		<div
			class={classes("m-sections", this.class)}
			data-m-navigation={use(this.style)}
			{...rest(this, ["title", "items", "active", "label"])}
		>
			{use(this.style).map((style) =>
				style === "sidebar" ? (
					<NavPane
						title={this.title}
						items={this.items}
						active={this.active}
						label={this.label}
					>
						{content}
					</NavPane>
				) : (
					<div class="m-sections-pivot">
						<p class="m-sections-title" data-m-feather>
							{this.title}
						</p>
						<PageHeader>
							<Pivot
								items={this.items}
								active={this.active}
								label={this.label}
							/>
						</PageHeader>
						<div data-m-content>{content}</div>
					</div>
				)
			)}
		</div>
	);
}

export default Sections;
