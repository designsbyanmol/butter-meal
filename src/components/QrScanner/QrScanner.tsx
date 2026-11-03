// src/components/QrScanner/QrScanner.tsx
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button, Banner } from '../ui';
import { CloseIcon } from '../../assets/svgs';
import local from './QrScanner.module.scss';

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fires once when a valid UPI QR is decoded. */
  onScan: (result: {
    raw: string;
    payeeVpa: string;
    payeeName?: string;
    amount?: number;
  }) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);

  const [error, setError] = useState<string>('');
  const [ready, setReady] = useState(false);

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setReady(false);
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, img.width, img.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data && !scannedRef.current) {
            const parsed = parseUpiQr(code.data);
            if (parsed) {
              scannedRef.current = true;
              stopCamera();
              onScan(parsed);
              return;
            }
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setError('');
    setReady(false);
    scannedRef.current = false;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError(
        'Camera is not available. Please use a phone with a camera, or pay from your UPI app manually.',
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();
          setReady(true);
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : 'Unable to start camera';
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={local.overlay} role="dialog" aria-modal="true">
      <div className={local.header}>
        <h3 className={local.title}>Scan store QR</h3>
        <button
          type="button"
          className={local.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon width={20} height={20} fill="#fff" />
        </button>
      </div>

      <div className={local.stage}>
        <video
          ref={videoRef}
          className={local.video}
          playsInline
          muted
          autoPlay
        />
        <div className={local.frame} aria-hidden />
        <canvas ref={canvasRef} className={local.hiddenCanvas} />
      </div>

      {error ? (
        <div className={local.footer}>
          <Banner variant="error" inline>
            {error}
          </Banner>
          <Button variant="ghost" onClick={onClose} block>
            Close
          </Button>
        </div>
      ) : (
        <div className={local.footer}>
          <p className={local.hint}>
            {ready
              ? 'Point your camera at the store UPI QR code.'
              : 'Starting camera…'}
          </p>
          <Button variant="ghost" onClick={onClose} block>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Parse a UPI QR payload. Returns null for anything that isn't
 * a UPI intent.
 */
const parseUpiQr = (
  raw: string,
): {
  raw: string;
  payeeVpa: string;
  payeeName?: string;
  amount?: number;
} | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^upi:\/\/pay/i.test(trimmed)) return null;
  try {
    const qs = trimmed.split('?')[1] ?? '';
    const params = new URLSearchParams(qs);
    const pa = params.get('pa');
    if (!pa) return null;
    const pn = params.get('pn') || undefined;
    const amRaw = params.get('am');
    const am = amRaw ? Number(amRaw) : undefined;
    return {
      raw: trimmed,
      payeeVpa: pa,
      payeeName: pn,
      amount: Number.isFinite(am) && am && am > 0 ? am : undefined,
    };
  } catch {
    return null;
  }
};

export default QrScanner;