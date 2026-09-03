export const LOGO_SRC = '/Logo.ico';

export function LogoMark({ size = 28, className = '' }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={LOGO_SRC}
            alt=""
            width={size}
            height={size}
            className={`app-logo-mark${className ? ` ${className}` : ''}`}
            draggable={false}
        />
    );
}

export default function Logo({
    size = 28,
    showText = true,
    className = '',
    textClassName = '',
    interactive = false,
}) {
    return (
        <span
            className={`app-logo${interactive ? ' app-logo-interactive' : ''}${className ? ` ${className}` : ''}`}
        >
            <LogoMark size={size} />
            {showText && (
                <span className={`app-logo-text${textClassName ? ` ${textClassName}` : ''}`}>
                    Harbinger
                </span>
            )}
        </span>
    );
}
