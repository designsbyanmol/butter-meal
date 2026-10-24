// src/components/Contact/ContactPage.tsx
import React, { useState } from 'react';
import {
  Button,
  FormField,
  Input,
  Banner,
} from '../ui';
import { LeftArrowIcon, CopyIcon, EmailIcon, InfoIcon, Copyright } from '../../assets/svgs';
import local from './ContactPage.module.scss';

const LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp';

const CONTACT_EMAIL = 'ContactDozzelo@gmail.com';

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const goHome = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = '/';
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Compose a mailto link so the enquiry lands in the admin inbox.
    const subject = `Dozzelo contact - ${storeName || name || 'New enquiry'}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Store: ${storeName}`,
      '',
      'Message:',
      message,
    ].join('\n');

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
    window.setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className={local.page}>
      <div className={local.header}>
        <div className={local.headerInner}>
          <a href="/" className={local.brand} onClick={goHome}>
            <img
              src={LOGO_URL}
              alt="Dozzelo"
              className={local.brandLogo}
              draggable={false}
            />
          </a>

          <div className={local.headerActions}>
            <a href="/" className={local.backLink} onClick={goHome}>
              <LeftArrowIcon width={16} height={16} fill="#1e1e1e" />
              Back to home
            </a>
          </div>
        </div>
      </div>

      <main className={local.main}>
        <div className={local.inner}>
          <div className={local.heroBlock}>
            <span className={local.eyebrow}>Contact us</span>
            <h1 className={local.title}>We're here to help</h1>
            <p className={local.subtitle}>
              Questions about your store, billing, or getting set up? Send us
              a message and our team will reply as soon as possible.
            </p>
          </div>

          <div className={local.grid}>
            {/* ---------- Left: form ---------- */}
            <form className={local.card} onSubmit={handleSubmit}>
              <div>
                <h2 className={local.formHeading}>Send us a message</h2>
                <p className={local.formHint}>
                  We usually reply within one business day. For urgent login
                  issues, mention your store name and phone number.
                </p>
              </div>

              {sent && (
                <Banner variant="success" inline>
                  Opening your email app - please send the message to complete
                  your enquiry.
                </Banner>
              )}

              <div className={local.fieldGrid}>
                <FormField label="Your name" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Anmol Verma"
                    required
                  />
                </FormField>

                <FormField label="Email" required>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </FormField>
              </div>

              <FormField label="Store name (optional)">
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g., Spice Route"
                />
              </FormField>

              <div className={local.textareaWrap}>
                <label className={local.textareaLabel} htmlFor="contact-msg">
                  Message <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <textarea
                  id="contact-msg"
                  className={local.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us how we can help..."
                  required
                  maxLength={2000}
                />
              </div>

              <div className={local.actions}>
                <Button
                  type="submit"
                  disabled={!name.trim() || !email.trim() || !message.trim()}
                >
                  Send message
                </Button>
              </div>
            </form>

            {/* ---------- Right: info cards ---------- */}
            <div className={local.infoCol}>
              <div className={local.infoCard}>
                <div className={local.infoBody}>
                  <h3 className={local.infoTitle}><EmailIcon width={20} height={20} fill="#1e7e34" /> Email us</h3>
                  <p className={local.infoText}>
                    The fastest way to reach us. We usually reply within one
                    business day.
                  </p>
                  <div className={local.emailRow}>
                    <span className={local.emailValue}>{CONTACT_EMAIL}</span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={copyEmail}
                      leftIcon={
                        <CopyIcon width={14} height={14} fill="currentColor" />
                      }
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className={local.infoCard}>
                <div className={local.infoBody}>
                  <h3 className={local.infoTitle}><InfoIcon width={20} height={20} fill="#1e7e34" /> Include this to help us faster</h3>
                  <p className={local.infoText}>
                    Your store name, phone number, and a short description of
                    the issue. If it's a login problem, also mention the URL you
                    are trying to sign in to.
                  </p>
                </div>
              </div>

              <div className={local.infoCard}>
                <div className={local.infoBody}>
                  <h3 className={local.infoTitle}><LeftArrowIcon width={20} height={20} fill="#1e7e34" /> Looking for something else?</h3>
                  <p className={local.infoText}>
                    Check our{' '}
                    <a href="/p/terms.html">Terms</a>,{' '}
                    <a href="/p/privacy.html">Privacy Policy</a>, or{' '}
                    <a href="/p/security.html">Security</a> pages for common
                    questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className={local.footer}>
        <div className={local.footerInner}>
          <span className={local.footerCopy}><Copyright width={14} height={14}/> 2026 Dozzelo. All rights reserved.</span>
          <div className={local.footerLinks}>
            <a href="/p/privacy.html">Privacy</a>
            <a href="/p/terms.html">Terms</a>
            <a href="/p/cookies.html">Cookies</a>
            <a href="/p/security.html">Security</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;