import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { useJournal } from '../context/JournalContext';
import { api } from '../services/api';

export const ContactView: React.FC = () => {
  const { t } = useJournal();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('Please write a message before sending.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.sendMessage({
        name: isAnonymous ? 'Anonymous' : name,
        email: isAnonymous ? '' : email,
        subject,
        message,
        isAnonymous,
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to deliver message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4">
          <Mail className="w-5 h-5" />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-normal text-neutral-900 dark:text-neutral-100 tracking-tight mb-3">
          {t.contact.title}
        </h1>
        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 font-light leading-relaxed">
          {t.contact.subtitle}
        </p>
      </header>

      {submitted ? (
        <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-serif text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            {t.contact.successTitle}
          </h3>
          <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 font-light leading-relaxed mb-6">
            {t.contact.successDesc}
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
          >
            {t.contact.sendAnother}
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-8 rounded-3xl bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm space-y-5"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Anonymous Toggle */}
          <div className="flex items-center gap-2 pb-2 border-b border-black/5 dark:border-white/5">
            <input
              type="checkbox"
              id="anon-checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <label
              htmlFor="anon-checkbox"
              className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none"
            >
              {t.contact.anonymousLabel}
            </label>
          </div>

          {!isAnonymous && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                  {t.contact.nameLabel}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                  {t.contact.emailLabel}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
              {t.contact.subjectLabel}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="About a photograph, a thought, or just hello..."
              className="w-full px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
              {t.contact.messageLabel} *
            </label>
            <textarea
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write anything you'd like to share..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500 leading-relaxed resize-y"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{t.contact.privacyNote}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t.contact.sending : t.contact.sendButton}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
