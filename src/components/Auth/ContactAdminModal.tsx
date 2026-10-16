// components/Auth/ContactAdminModal.tsx
import React, { useState } from 'react';
import { Modal, IconButton } from '../ui';
import { CopyIcon, CheckIcon, EmailIcon } from '../../assets/svgs';
import local from './Auth.module.scss';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The email address shown to the user. */
  email: string;
}

const ContactAdminModal: React.FC<ContactAdminModalProps> = ({
  isOpen,
  onClose,
  email,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(
    'Login help',
  )}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      mobileFullScreen
      title="Contact Admin"
    >
      <div className={local.contactBody}>
        <div className={local.contactIcon} aria-hidden>
          <img
              src="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/email-image.webp"
              alt="email"
              className={local.emailImage}
              draggable={false}
            />
        </div>

        <p className={local.contactLead}>
          Need help signing in? Reach out to our admin team — we usually
          reply within a few minutes.
        </p>

        <div className={local.contactRow}>
          <span className={local.contactEmail} title={email}>
            {email}
          </span>
          <IconButton
            variant="soft"
            size="md"
            aria-label="Copy email address"
            tooltip={copied ? 'Copied' : 'Copy email'}
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon width={16} height={16} fill="#1e7e34" />
            ) : (
              <CopyIcon width={16} height={16} fill="#4d4d4d" />
            )}
          </IconButton>
        </div>

        <a className={local.contactMailBtn} href={mailtoHref}>
          Send Email
        </a>

        <p className={local.contactFootnote}>
          Please include your store name and phone number in the email so
          we can assist you faster.
        </p>
      </div>
    </Modal>
  );
};

export default ContactAdminModal;