/**
 * 根据滚动方向决定顶栏是否隐藏。
 * 向下滑隐藏，向上滑显示；靠近顶部时始终显示。
 */
export const shouldHideHeaderOnScroll = (params: {
  currentY: number;
  lastY: number;
  /** 小于该距离时强制显示顶栏 */
  topRevealPx?: number;
  /** 忽略过小抖动，避免频繁切换 */
  deltaThresholdPx?: number;
}): boolean | null => {
  const topRevealPx = params.topRevealPx ?? 56;
  const deltaThresholdPx = params.deltaThresholdPx ?? 8;
  const delta = params.currentY - params.lastY;

  if (params.currentY <= topRevealPx) {
    return false;
  }

  if (delta > deltaThresholdPx) {
    return true;
  }

  if (delta < -deltaThresholdPx) {
    return false;
  }

  // 抖动过小：保持现状
  return null;
};
