import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2', sm: 'h-8 rounded-md px-3 text-xs', lg: 'h-10 rounded-md px-8', icon: 'h-9 w-9',
      },
    }, defaultVariants: { variant: 'default', size: 'default' },
  }
);

export function Button({ className = '', variant, size, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...rest} />;
}
export function LoadingButton({ loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean } & VariantProps<typeof buttonVariants>) {
  return <Button disabled={loading || rest.disabled} {...rest}>{loading ? 'Please wait…' : children}</Button>;
}
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-md border bg-card text-card-foreground', className)}>{children}</div>;
}
export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) { return <div className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)}>{children}</div>; }
export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) { return <h3 className={cn('text-sm font-semibold leading-none tracking-tight', className)}>{children}</h3>; }
export function CardDescription({ className = '', children }: { className?: string; children: React.ReactNode }) { return <div className={cn('text-xs text-muted-foreground', className)}>{children}</div>; }
export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) { return <div className={cn('p-5 pt-0', className)}>{children}</div>; }
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', props.className)} {...props} />; }
export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', className)}>{children}</span>; }
export function Skeleton({ className = '' }: { className?: string }) { return <div className={cn('animate-pulse rounded-md bg-muted', className)} />; }
