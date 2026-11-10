import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../components/verification/TextInput';
import { ModeSelector } from '../components/verification/ModeSelector';
import { VerificationProgress } from '../components/verification/VerificationProgress';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useVerification } from '../hooks/useVerification';
import { submitDocumentVerification, submitUrlVerification } from '../services/api';
import type { VerificationMode } from '../types';
import { Play, Sparkles, AlertCircle, FileText, Upload, Globe, CheckCircle2 } from 'lucide-react';

type InputSource = 'text' | 'document' | 'url';

export const VerificationWorkspace: React.FC = () => {
  const [inputSource, setInputSource] = useState<InputSource>('text');
  const [text, setText] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<VerificationMode>('standard');
  const [historicalDate, setHistoricalDate] = useState<string>('2023-01-01');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startVerification, isLoading, error } = useVerification();
  const navigate = useNavigate();

  const handleStartVerification = async () => {
    setValidationError(null);

    if (inputSource === 'text') {
      const trimmed = text.trim();
      if (!trimmed) {
        setValidationError('Please enter or paste an AI-generated answer to verify.');
        return;
      }
      if (trimmed.length < 15) {
        setValidationError('The submitted text is too short. Please provide at least one complete factual sentence.');
        return;
      }
      try {
        const jobId = await startVerification(
          trimmed,
          mode,
          mode === 'time_travel' ? historicalDate : undefined
        );
        navigate(`/results?job_id=${jobId}`);
      } catch {
        // Error handled by hook
      }
    } else if (inputSource === 'document') {
      if (!selectedFile) {
        setValidationError('Please select or upload a document (.pdf, .docx, or .txt).');
        return;
      }
      try {
        setIsUploading(true);
        const res = await submitDocumentVerification(
          selectedFile,
          mode,
          mode === 'time_travel' ? historicalDate : undefined
        );
        if (res.id) {
          navigate(`/results?job_id=${res.id}`);
        }
      } catch (err: any) {
        setValidationError(err.response?.data?.detail || err.message || 'Document processing failed.');
      } finally {
        setIsUploading(false);
      }
    } else if (inputSource === 'url') {
      const trimmedUrl = urlInput.trim();
      if (!trimmedUrl) {
        setValidationError('Please enter a valid HTTP or HTTPS webpage URL.');
        return;
      }
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        setValidationError('URL must start with http:// or https://');
        return;
      }
      try {
        setIsUploading(true);
        const res = await submitUrlVerification(
          trimmedUrl,
          mode,
          mode === 'time_travel' ? historicalDate : undefined
        );
        if (res.id) {
          navigate(`/results?job_id=${res.id}`);
        }
      } catch (err: any) {
        setValidationError(err.response?.data?.detail || err.message || 'Webpage extraction and verification failed.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'txt', 'md'].includes(ext || '')) {
        setValidationError('Unsupported format. Please upload .pdf, .docx, or .txt files.');
        return;
      }
      setSelectedFile(file);
      setValidationError(null);
    }
  };

  const isBusy = isLoading || isUploading;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title & Intro */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Verification Workspace
        </h1>
        <p className="text-xs text-slate-400">
          Verify AI responses, uploaded documents, or live webpages. VerityAI extracts claims, searches Tavily for live evidence, and verifies through Bifrost.
        </p>
      </div>

      {validationError && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-center gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {/* Main Form Card */}
      <div className="p-6 rounded-2xl bg-[#111827] border border-[#1e3a5f] shadow-xl space-y-6">
        {/* Verification Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Select Verification Protocol
          </label>
          <ModeSelector
            mode={mode}
            onModeChange={setMode}
            historicalDate={historicalDate}
            onDateChange={setHistoricalDate}
          />
        </div>

        {/* Input Source Selector Tabs */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Verification Input Source
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setInputSource('text');
                setValidationError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                inputSource === 'text'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Direct AI Text</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputSource('document');
                setValidationError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                inputSource === 'document'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Document Upload</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputSource('url');
                setValidationError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                inputSource === 'url'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Webpage URL</span>
            </button>
          </div>
        </div>

        {/* Input Source Forms */}
        {inputSource === 'text' && (
          <TextInput
            value={text}
            onChange={(val) => {
              setText(val);
              if (validationError) setValidationError(null);
            }}
            onClear={() => {
              setText('');
              setValidationError(null);
            }}
            onSampleLoad={(sample) => {
              setText(sample);
              setValidationError(null);
            }}
            disabled={isBusy}
          />
        )}

        {inputSource === 'document' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-900/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to select or drop document here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports PDF, DOCX, and TXT files up to 15MB.
              </p>
              {selectedFile && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready for claim extraction ({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {inputSource === 'url' && (
          <div className="space-y-3">
            <label className="text-xs text-slate-300 block">
              Enter Public Webpage or Article URL to Audit:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="https://example.com/ai-whitepaper-or-announcement"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              VerityAI safely extracts article text with strict SSRF protection and extracts verifiable claims.
            </p>
          </div>
        )}

        {/* Start Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Zero hallucination tolerance • Real Tavily web evidence</span>
          </div>

          <button
            type="button"
            onClick={handleStartVerification}
            disabled={isBusy}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isBusy ? 'Processing & Auditing...' : 'Start Verification'}</span>
          </button>
        </div>
      </div>

      {/* Verification In-Progress Indicator */}
      {isBusy && <VerificationProgress status="Processing" />}
    </div>
  );
};
