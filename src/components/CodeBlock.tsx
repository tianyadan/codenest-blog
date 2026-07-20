import { useState } from 'react';
import { useAppContext } from '../layouts/AppLayout';

type CodeBlockProps = {
  code: string;
};

/** Markdown 代码块：支持一键复制正文（不含围栏）。 */
export function CodeBlock({ code }: CodeBlockProps) {
  const { dictionary } = useAppContext();
  const [copied, setCopied] = useState(false);

  /** 复制代码块文本到剪贴板。 */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-block">
      <button className="code-block-copy" type="button" onClick={handleCopy}>
        {copied ? dictionary.actions.copied : dictionary.actions.copyCode}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
