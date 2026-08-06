import { describe, expect, it } from 'vitest';
import { shouldHideHeaderOnScroll } from './scrollHeader';

describe('shouldHideHeaderOnScroll', () => {
  it('always shows header near the top', () => {
    expect(
      shouldHideHeaderOnScroll({
        currentY: 20,
        lastY: 10
      })
    ).toBe(false);
  });

  it('hides header when scrolling down past top area', () => {
    expect(
      shouldHideHeaderOnScroll({
        currentY: 180,
        lastY: 140
      })
    ).toBe(true);
  });

  it('shows header when scrolling up', () => {
    expect(
      shouldHideHeaderOnScroll({
        currentY: 120,
        lastY: 180
      })
    ).toBe(false);
  });

  it('returns null for tiny jitter', () => {
    expect(
      shouldHideHeaderOnScroll({
        currentY: 160,
        lastY: 156
      })
    ).toBeNull();
  });
});
