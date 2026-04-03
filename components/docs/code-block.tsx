'use client';

import * as React from 'react';
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

const highlightCode = (code: string, language: string) => {
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'json') {
    highlighted = highlighted
      .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-amber-400">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-blue-400">$1</span>');
  } else if (language === 'bash' || language === 'shell') {
    highlighted = highlighted
      .replace(/^(\$|#)/gm, '<span class="text-gray-500">$1</span>')
      .replace(/(curl|wget|npm|pip|python|node|php|composer)/g, '<span class="text-green-400">$1</span>')
      .replace(/(-[a-zA-Z]+|--[a-zA-Z-]+)/g, '<span class="text-blue-400">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="text-amber-400">"$1"</span>')
      .replace(/'([^']+)'/g, '<span class="text-amber-400">\'$1\'</span>');
  } else if (['javascript', 'js', 'typescript', 'ts'].includes(language)) {
    highlighted = highlighted
      .replace(/\b(const|let|var|function|async|await|return|if|else|try|catch|throw|new|class|import|export|from|default|require)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
      .replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
      .replace(/`([^`]+)`/g, '<span class="text-green-400">`$1`</span>')
      .replace(/\/\/(.*)$/gm, '<span class="text-gray-500">//$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');
  } else if (language === 'python') {
    highlighted = highlighted
      .replace(/\b(def|class|import|from|return|if|elif|else|try|except|raise|async|await|with|as|for|in|while|True|False|None|self)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/(f?)"([^"]+)"/g, '$1<span class="text-green-400">"$2"</span>')
      .replace(/(f?)'([^']+)'/g, '$1<span class="text-green-400">\'$2\'</span>')
      .replace(/#(.*)$/gm, '<span class="text-gray-500">#$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');
  } else if (language === 'php') {
    highlighted = highlighted
      .replace(/\b(function|class|return|if|else|try|catch|throw|new|use|namespace|public|private|protected|static|echo|require|include)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/(\$\w+)/g, '<span class="text-blue-400">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
      .replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
      .replace(/\/\/(.*)$/gm, '<span class="text-gray-500">//$1</span>');
  } else if (language === 'html') {
    highlighted = highlighted
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="text-pink-400">$2</span>')
      .replace(/([\w-]+)=/g, '<span class="text-purple-400">$1</span>=')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>');
  }

  return highlighted;
};

export function CodeBlock({ code, language = 'javascript', filename, className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = highlightCode(code, language);

  return (
    <div className={cn('group relative rounded-xl overflow-hidden border border-gray-800', className)}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
          <span className="text-xs text-gray-400 font-mono">{filename}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{language}</span>
        </div>
      )}

      <div className="relative bg-[#0d1117] overflow-x-auto">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
        </button>

        <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto">
          <code className="font-mono text-gray-300" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  );
}

export function TabbedCodeBlock({ tabs, className }: TabbedCodeBlockProps) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tabs[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = highlightCode(tabs[activeTab].code, tabs[activeTab].language);

  return (
    <div className={cn('group relative rounded-xl overflow-hidden border border-gray-800', className)}>
      {/* Language tabs */}
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

      <div className="relative bg-[#0d1117] overflow-x-auto">
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
        </button>

        <pre className="p-4 text-[13px] leading-relaxed overflow-x-auto">
          <code className="font-mono text-gray-300" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
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
