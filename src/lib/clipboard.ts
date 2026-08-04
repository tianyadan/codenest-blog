/**
 * 将文本复制到剪贴板。
 * 优先用 Clipboard API；在非安全上下文 / 权限被拒时回退到 textarea + execCommand。
 */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (typeof text !== 'string') {
    return false;
  }

  // 现代浏览器 + HTTPS / localhost
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 继续走降级方案
    }
  }

  return copyTextWithTextarea(text);
};

/** 降级复制：通过临时 textarea 选中后执行 document.execCommand('copy')。 */
const copyTextWithTextarea = (text: string): boolean => {
  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(textarea);

  // 尽量恢复用户原先选区，避免页面跳动感
  if (selection) {
    selection.removeAllRanges();
    if (previousRange) {
      selection.addRange(previousRange);
    }
  }

  return ok;
};
