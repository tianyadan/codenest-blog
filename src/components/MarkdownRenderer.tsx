import { type ReactNode } from 'react';
import { slugifyHeading } from '../lib/toc';

type MarkdownRendererProps = {
  markdown: string;
};

const renderInlineText = (text: string) => text;

/** 解析独占一行的 Markdown 图片：![alt](src "optional title")。 */
const parseMarkdownImage = (line: string) => {
  const matched = line.trim().match(/^!\[([^\]]*)\]\((\S