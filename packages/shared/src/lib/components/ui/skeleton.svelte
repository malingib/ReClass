<script lang="ts">
  import { cn } from './utils';
  
  const { 
    class: className = '',
    variant = 'text',
    width,
    height
  }: {
    class?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string;
    height?: string;
  } = $props();
  
  const baseStyles = 'animate-pulse rounded-md bg-slate-200';
  
  const variantStyles = {
    text: 'h-4 w-full',
    circular: 'h-10 w-10 rounded-full',
    rectangular: 'h-20 w-full',
    card: 'h-32 w-full rounded-xl'
  };
</script>

<div 
  class={cn(baseStyles, variantStyles[variant], className)}
  style:width={width}
  style:height={height}
  aria-hidden="true"
></div>
