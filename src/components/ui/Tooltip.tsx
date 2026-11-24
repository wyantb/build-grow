import { createSignal, onCleanup, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { Portal } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { getTooltipDelay } from '../../hooks/useSettings.js';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Tooltip text. */
  content: JSX.Element;
  /** Preferred side. The tooltip flips when it would overflow the viewport. */
  placement?: TooltipPlacement;
  /** Extra class on the trigger wrapper. */
  class?: string;
  /** The element the tooltip describes. */
  children: JSX.Element;
}

interface Position {
  top: number;
  left: number;
  placement: TooltipPlacement;
}

const GAP = 8;
const EDGE_PADDING = 8;

/**
 * A tooltip that appears after the configured delay and follows its trigger.
 *
 * The delay is app-wide and user-configurable, so a pending timer is
 * restarted when the delay changes while the pointer is still hovering.
 */
const Tooltip: Component<TooltipProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  const [position, setPosition] = createSignal<Position>({ top: 0, left: 0, placement: 'top' });

  let trigger: HTMLSpanElement | undefined;
  let bubble: HTMLDivElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let measureTimer: ReturnType<typeof setTimeout> | undefined;

  const clearTimers = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (measureTimer !== undefined) {
      clearTimeout(measureTimer);
      measureTimer = undefined;
    }
  };

  /**
   * The trigger wrapper uses `display: contents`, so it has no box of its
   * own. A Range over its contents yields the real anchor rectangle.
   */
  const anchorRect = (): DOMRect | null => {
    if (!trigger) {
      return null;
    }

    const range = document.createRange();
    range.selectNodeContents(trigger);

    const rect = range.getBoundingClientRect();

    return rect.width === 0 && rect.height === 0 ? null : rect;
  };

  const place = () => {
    if (!bubble) {
      return;
    }

    const anchor = anchorRect();

    if (!anchor) {
      return;
    }

    const size = bubble.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const preferred = props.placement ?? 'top';
    const opposite: Record<TooltipPlacement, TooltipPlacement> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left'
    };

    const fits: Record<TooltipPlacement, boolean> = {
      top: anchor.top - size.height - GAP >= EDGE_PADDING,
      bottom: anchor.bottom + size.height + GAP <= viewportHeight - EDGE_PADDING,
      left: anchor.left - size.width - GAP >= EDGE_PADDING,
      right: anchor.right + size.width + GAP <= viewportWidth - EDGE_PADDING
    };

    // Flip to the opposite side when the preferred side does not fit.
    let placement = preferred;
    if (!fits[preferred] && fits[opposite[preferred]]) {
      placement = opposite[preferred];
    }

    let top: number;
    let left: number;

    if (placement === 'top' || placement === 'bottom') {
      top = placement === 'top' ? anchor.top - size.height - GAP : anchor.bottom + GAP;
      left = anchor.left + anchor.width / 2 - size.width / 2;
    } else {
      top = anchor.top + anchor.height / 2 - size.height / 2;
      left = placement === 'left' ? anchor.left - size.width - GAP : anchor.right + GAP;
    }

    // Keep the bubble inside the viewport.
    left = Math.min(Math.max(left, EDGE_PADDING), Math.max(EDGE_PADDING, viewportWidth - size.width - EDGE_PADDING));
    top = Math.min(Math.max(top, EDGE_PADDING), Math.max(EDGE_PADDING, viewportHeight - size.height - EDGE_PADDING));

    setPosition({ top, left, placement });
  };

  const show = () => {
    clearTimers();
    timer = setTimeout(() => {
      setOpen(true);
      // Measure once the bubble is in the DOM.
      measureTimer = setTimeout(place, 0);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
    }, getTooltipDelay());
  };

  const hide = () => {
    clearTimers();
    setOpen(false);
    stopTracking();
  };

  const stopTracking = () => {
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
  };

  const reposition = () => {
    if (open()) {
      place();
    }
  };

  onCleanup(() => {
    clearTimers();
    stopTracking();
  });

  return (
    <span
      ref={trigger}
      class={`tooltip-trigger ${props.class ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusIn={show}
      onFocusOut={hide}
      onPointerDown={hide}
      >
      {props.children}
      <Show when={open()}>
        <Portal>
          <div
            ref={bubble}
            class={`tooltip tooltip-${position().placement}`}
            role="tooltip"
            style={{ top: `${position().top}px`, left: `${position().left}px` }}
          >
            {props.content}
          </div>
        </Portal>
      </Show>
    </span>
  );
};

export default Tooltip;
