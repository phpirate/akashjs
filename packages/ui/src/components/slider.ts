/**
 * Material Design 3 Slider component.
 *
 * Draggable slider with track, filled track, and thumb elements.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

export interface SliderProps {
  value?: Signal<number> | number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  onChange?: (value: number) => void;
}

export const Slider = defineComponent<SliderProps>((ctx) => {
  const {
    value,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    label,
    onChange,
  } = ctx.props;

  const isSignal = typeof value === 'function' && 'set' in (value as object);

  function getValue(): number {
    if (isSignal) return (value as Signal<number>)();
    return (value as number) ?? min;
  }

  function clamp(v: number): number {
    const clamped = Math.min(max, Math.max(min, v));
    // Snap to step
    return Math.round((clamped - min) / step) * step + min;
  }

  function toPercent(v: number): number {
    if (max === min) return 0;
    return ((v - min) / (max - min)) * 100;
  }

  return () => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: inline-flex;
      flex-direction: column;
      gap: 8px;
      min-width: 200px;
      font-family: inherit;
      ${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}
    `;

    // --- Label ---
    if (label) {
      const labelEl = document.createElement('div');
      labelEl.textContent = label;
      labelEl.style.cssText = `
        font-size: 14px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        font-weight: 500;
      `;
      wrapper.appendChild(labelEl);
    }

    // --- Slider container ---
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      position: relative;
      height: 40px;
      display: flex;
      align-items: center;
      cursor: ${disabled ? 'default' : 'pointer'};
      touch-action: none;
    `;

    // --- Track (background) ---
    const track = document.createElement('div');
    track.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      height: 4px;
      border-radius: 2px;
      background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
    `;

    // --- Filled track ---
    const filledTrack = document.createElement('div');
    const updateFill = (percent: number) => {
      filledTrack.style.cssText = `
        position: absolute;
        left: 0;
        height: 4px;
        border-radius: 2px;
        background-color: var(--md-sys-color-primary, #6750a4);
        width: ${percent}%;
        transition: width 0ms;
      `;
    };
    updateFill(toPercent(getValue()));

    // --- Thumb ---
    const thumb = document.createElement('div');
    const updateThumb = (percent: number) => {
      thumb.style.cssText = `
        position: absolute;
        left: ${percent}%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: var(--md-sys-color-primary, #6750a4);
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        transition: box-shadow 200ms;
        z-index: 1;
      `;
    };
    updateThumb(toPercent(getValue()));

    // --- Hover state ring ---
    const stateLayer = document.createElement('div');
    stateLayer.style.cssText = `
      position: absolute;
      left: ${toPercent(getValue())}%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: transparent;
      pointer-events: none;
      transition: background-color 200ms;
      z-index: 0;
    `;

    const updateStateLayer = (percent: number) => {
      stateLayer.style.left = `${percent}%`;
    };

    if (!disabled) {
      thumb.addEventListener('mouseenter', () => {
        stateLayer.style.backgroundColor = 'rgba(103, 80, 164, 0.08)';
        thumb.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      });
      thumb.addEventListener('mouseleave', () => {
        stateLayer.style.backgroundColor = 'transparent';
        thumb.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
      });
    }

    // --- Pointer event handling ---
    const updatePosition = (clientX: number) => {
      const rect = sliderContainer.getBoundingClientRect();
      const rawPercent = (clientX - rect.left) / rect.width;
      const rawValue = min + rawPercent * (max - min);
      const snapped = clamp(rawValue);
      const percent = toPercent(snapped);

      updateFill(percent);
      updateThumb(percent);
      updateStateLayer(percent);

      if (isSignal) {
        (value as Signal<number>).set(snapped);
      }
      if (onChange) onChange(snapped);
    };

    if (!disabled) {
      let dragging = false;

      sliderContainer.addEventListener('pointerdown', (e: PointerEvent) => {
        dragging = true;
        sliderContainer.setPointerCapture(e.pointerId);
        updatePosition(e.clientX);
        stateLayer.style.backgroundColor = 'rgba(103, 80, 164, 0.12)';
      });

      sliderContainer.addEventListener('pointermove', (e: PointerEvent) => {
        if (!dragging) return;
        updatePosition(e.clientX);
      });

      sliderContainer.addEventListener('pointerup', (e: PointerEvent) => {
        dragging = false;
        sliderContainer.releasePointerCapture(e.pointerId);
        stateLayer.style.backgroundColor = 'transparent';
      });

      sliderContainer.addEventListener('pointercancel', (e: PointerEvent) => {
        dragging = false;
        stateLayer.style.backgroundColor = 'transparent';
      });
    }

    // --- Reactive sync ---
    if (isSignal) {
      effect(() => {
        const v = (value as Signal<number>)();
        const percent = toPercent(v);
        updateFill(percent);
        updateThumb(percent);
        updateStateLayer(percent);
      });
    }

    track.appendChild(filledTrack);
    sliderContainer.appendChild(track);
    sliderContainer.appendChild(stateLayer);
    sliderContainer.appendChild(thumb);
    wrapper.appendChild(sliderContainer);

    return wrapper;
  };
});
