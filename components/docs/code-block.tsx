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

// Simple syntax highlighting patterns
const highlightCode = (code: string, language: string) => {
  let highlighted = code;

  // Escape HTML
  highlighted = highlighted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'json') {
    // JSON highlighting
    highlighted = highlighted
      .replace(/"([^"]+)":/g, '<span class="text-purple-400">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-amber-400">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-blue-400">$1</span>');
  } else if (language === 'bash' || language === 'shell') {
    // Bash highlighting
    highlighted = highlighted
      .replace(/^(\$|#)/gm, '<span class="text-gray-500">$1</span>')
      .replace(/(curl|wget|npm|pip|python|node)/g, '<span class="text-green-400">$1</span>')
      .replace(/(-[a-zA-Z]+|--[a-zA-Z-]+)/g, '<span class="text-blue-400">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="text-amber-400">"$1"</span>')
      .replace(/'([^']+)'/g, '<span class="text-amber-400">\'$1\'</span>');
  } else if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') {
    // JavaScript/TypeScript highlighting
    highlighted = highlighted
      .replace(/\b(const|let|var|function|async|await|return|if|else|try|catch|throw|new|class|import|export|from|default)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
      .replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
      .replace(/`([^`]+)`/g, '<span class="text-green-400">`$1`</span>')
      .replace(/\/\/(.*)$/gm, '<span class="text-gray-500">//$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');
  } else if (language === 'python') {
    // Python highlighting
    highlighted = highlighted
      .replace(/\b(def|class|import|from|return|if|elif|else|try|except|raise|async|await|with|as|for|in|while|True|False|None)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>')
      .replace(/'([^']+)'/g, '<span class="text-green-400">\'$1\'</span>')
      .replace(/#(.*)$/gm, '<span class="text-gray-500">#$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>');
  } else if (language === 'html') {
    // HTML highlighting
    highlighted = highlighted
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="text-pink-400">$2</span>')
      .replace(/([\w-]+)=/g, '<span class="text-purple-400">$1</span>=')
      .replace(/"([^"]+)"/g, '<span class="text-green-400">"$1"</span>');
  }

  return highlighted;
};

export function CodeBlock({
  code,
  language = 'javascript',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');
  const highlightedCode = highlightCode(code, language);

  return (
    <div className={cn('group relative rounded-xl overflow-hidden', className)}>
      {/* Header */}
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <span className="text-sm text-gray-400 font-mono">{filename}</span>
          <span className="text-xs text-gray-500 uppercase">{language}</span>
        </div>
      )}

      {/* Code */}
      <div className="relative bg-gray-900 overflow-x-auto">
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-lg transition-all',
            'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white',
            'opacity-0 group-hover:opacity-100 focus:opacity-100'
          )}
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="size-4 text-green-400" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>

        <pre className="p-4 text-sm leading-relaxed overflow-x-auto">
          <code
            className="font-mono text-gray-300"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
}

interface InlineCodeProps {
  children: React.ReactNode;
}

export function InlineCode({ children }: InlineCodeProps) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-sm font-mono">
      {children}
    </code>
  );
}
