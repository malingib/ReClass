<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
		hover = false,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { size?: "default" | "sm"; hover?: boolean } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	data-hover={hover ? '' : undefined}
	class={cn(
		"gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)]",
		"has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
		"data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0",
		"*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
		"group/card flex flex-col transition-all duration-200 ease-out",
		"data-hover:hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)] data-hover:hover:ring-foreground/15 data-hover:hover:-translate-y-0.5",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
