import type { JSX } from '@solidjs/web';

export interface IconProps {
  /** Width and height in pixels. */
  size?: number;
  /** Accessible name. Without one the icon is hidden from screen readers. */
  title?: string;
  class?: string;
}

/**
 * A grip of dots, the usual sign for "drag me".
 *
 * It is drawn with a plain SVG so it takes the color of the text around it
 * and needs no extra asset.
 */
export const DragHandleIcon = (props: IconProps): JSX.Element => {
  const size = () => props.size ?? 16;

  return (
    <svg
      class={props.class}
      width={size()}
      height={size()}
      viewBox="0 0 10 16"
      fill="currentColor"
      aria-hidden={props.title ? undefined : 'true'}
      role={props.title ? 'img' : undefined}
      >
      {props.title ? <title>{props.title}</title> : null}
      <circle cx="2" cy="3" r="1.4" />
      <circle cx="8" cy="3" r="1.4" />
      <circle cx="2" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="2" cy="13" r="1.4" />
      <circle cx="8" cy="13" r="1.4" />
    </svg>
  );
};
