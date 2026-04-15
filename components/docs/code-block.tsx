'use client';

import * as React from 'react';
import { Highlight, themes, type Language } from 'prism-react-renderer';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

interface TabbedCodeBlockProps {
  tabs: { label: string; language: string; code: string }[];
  className?: string;
}

const LANGUAGE_MAP: Record<string, Language> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  py: 'python',
};

function normalizeLanguage(lang: string): Language {
  const key = lang.toLowerCase();
  return (LANGUAGE_MAP[key] ?? key) as Language;
}

function Highlighted({ code, language }: { code: string; language: string }) {
  const lang = normalizeLanguage(language);
  return (
    <Highlight code={code.trimEnd()} language={lang} theme={themes.vsDark}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto bg-[#0d1117] font-mono">
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line });
            return (
              <div key={i} {...lineProps}>
                {line.map((token, key) => {
                  const tokenProps = getTokenProps({ token });
                  return <span key={key} {...tokenProps} />;
                })}
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}

export function CodeBlock({ code, language = 'javascript', filename, className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('group relative rounded-xl overflow-hidden border border-gray-800', className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
          <span className="text-xs text-gray-400 font-mono">{filename}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{language}</span>
        </div>
      )}

      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
        </button>
        <Highlighted code={code} language={language} />
      </div>
    </div>
  );
}

export function TabbedCodeBlock({ tabs, className }: TabbedCodeBlockProps) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const current = tabs[activeTab]!;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('group relative rounded-xl overflow-hidden border border-gray-800', className)}>
      <div className="flex items-center gap-0 bg-gray-800/80 border-b border-gray-700/50 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className={cn(
              'px-4 py-2 text-xs font-medium transition-colors shrink-0',
              i === activeTab
                ? 'text-white bg-[#0d1117] border-b-2 border-primary'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
        </button>
        <Highlighted code={current.code} language={current.language} />
      </div>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono">
      {children}
    </code>
  );
}
