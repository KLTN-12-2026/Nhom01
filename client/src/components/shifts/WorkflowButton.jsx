import { Button as BaseButton } from '../ui/button';
// Keep the workflow's primary actions visible without changing the rest of the app.
export function Button({ variant = 'default', className = '', ...props }) {
    const colors = variant === 'default' ? 'bg-primary text-primary-foreground' : variant === 'outline' ? 'text-foreground' : '';
    return <BaseButton {...props} variant={variant} className={[colors, className].filter(Boolean).join(' ')} />;
}
