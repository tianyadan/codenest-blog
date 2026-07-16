import { useEffect, useState } from 'react';
import type { Dictionary } from '../lib/i18n';

const contactEmail = '18661344507@163.com';

type EmailModalProps = {
  open: boolean;
  onClose: () => void;
  dictionary: Dictionary;
};

/** 邮箱弹窗，展示联系邮箱并提供复制功能 */
export function EmailModal({ open, onClose, dictionary }: EmailModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  /** 复制邮箱地址到剪贴板 */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="email-modal-title">{dictionary.pages.emailTitle}</h3>
          <button className="modal-close" type="button" onClick={onClose} aria-label={dictionary.actions.close}>
            ×
          </button>
        </div>
        <p className="modal-email">{contactEmail}</p>
        <button className="modal-copy-button" type="button" onClick={handleCopy}>
          {copied ? dictionary.actions.copied : dictionary.actions.copyEmail}
        </button>
      </div>
    </div>
  );
}
