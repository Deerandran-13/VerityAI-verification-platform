import React from 'react';
import { Sparkles, Trash2 } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSampleLoad: (sample: string) => void;
  disabled?: boolean;
}

const SAMPLE_TEXT = `Python 3.12 was released in October 2023 with isolated subinterpreters.
The OpenAI GPT-4 API endpoint is https://api.openai.com/v1/chat/completions and charges $30 per million prompt tokens.
According to the EU AI Act enacted in 2024, general purpose AI models must provide detailed training summaries.
Google announced the Gemini 2.0 Flash Thinking experimental model in late 2024 with bidirectional audio capabilities.`;

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onClear,
  onSampleLoad,
  disabled = false,
}) => {
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          AI-Generated Response to Verify
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSampleLoad(SAMPLE_TEXT)}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Sample
          </button>
          {value && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Paste AI response here (e.g. software versions, API documentation, technical specs, pricing, regulations)..."
          className="w-full p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono disabled:opacity-60 resize-y"
        />
        <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
        </div>
      </div>
    </div>
  );
};

