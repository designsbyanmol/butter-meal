// src/components/Admin/ImageUpload.tsx
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from 'react';
import { Button, IconButton, Banner } from '../ui';
import { CloseIcon, LeftArrowIcon, RightArrow } from '../../assets/svgs';
import { supabase } from '../../services/supabase.client';
import local from './ImageUpload.module.scss';

interface ImageUploadProps {
  onImageUploaded?: (imageUrl: string) => void;
  onImagesUploaded?: (images: string[]) => void;
  currentImage?: string;
  currentImages?: string[];
  label?: string;
  multiple?: boolean;
  maxImages?: number;
  folder?: string;
  maxDimension?: number;
  maxFileSizeMB?: number;
  replacePrimaryOnAdd?: boolean;
  /**
   * When true, picking a file does not upload immediately. The file
   * is held locally as a preview and only pushed to GitHub when the
   * parent calls `upload()` via the imperative handle. Use this for
   * modals that have an explicit Save button.
   */
  deferred?: boolean;
  /**
   * Called whenever the "staged and not yet uploaded" state flips.
   * The parent can wire this to a Save button's `disabled` prop.
   *
   * Only meaningful in deferred mode.
   */
  onPendingChange?: (pending: boolean) => void;
}

export interface ImageUploadHandle {
  /**
   * Called by the parent's Save handler.
   *
   * Return values:
   *   - A non-empty URL string → persist this URL.
   *   - The empty string `''`   → clear the stored image.
   *   - `null`                  → the upload failed (ImageUpload has
   *                               already surfaced its own error).
   *   - `undefined`             → the component isn't mounted.
   */
  upload: () => Promise<string | null>;
  hasPending: () => boolean;
  /** Revert any staged-but-unsaved change. */
  discard: () => void;
}

const SVG_MAX_BYTES = 512 * 1024;

const isSvgFile = (file: File): boolean =>
  file.type === 'image/svg+xml' ||
  file.name.toLowerCase().endsWith('.svg');

const ImageUpload = forwardRef<ImageUploadHandle, ImageUploadProps>(
  (
    {
      onImageUploaded,
      onImagesUploaded,
      currentImage = '',
      currentImages = [],
      label = 'Upload Image',
      multiple = false,
      maxImages = 6,
      folder = 'menu-items',
      maxDimension = 1024,
      maxFileSizeMB = 2,
      replacePrimaryOnAdd = false,
      deferred = false,
      onPendingChange,
    },
    ref,
  ) => {
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState<string[]>(
      multiple
        ? currentImages && currentImages.length > 0
          ? currentImages
          : currentImage
          ? [currentImage]
          : []
        : [],
    );
    const [singlePreview, setSinglePreview] = useState<string | null>(
      multiple ? null : currentImage || null,
    );
    const [error, setError] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    // ---- Deferred-mode staging ----
    // The File object the user picked but hasn't saved yet.
    const stagedFileRef = useRef<File | null>(null);
    // Object URL (or data URL) used for the preview while staged.
    const stagedPreviewRef = useRef<string | null>(null);
    // True when there's an unsaved change:
    //   - a staged file  → upload on save
    //   - a removal      → clear on save
    const [hasPending, setHasPending] = useState(false);
    // True when the user removed the current image and hasn't saved yet.
    const removedStagedRef = useRef(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      onPendingChange?.(hasPending);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasPending]);

    useEffect(() => {
      return () => {
        if (stagedPreviewRef.current?.startsWith('blob:')) {
          URL.revokeObjectURL(stagedPreviewRef.current);
        }
      };
    }, []);

    // ---------------------------------------------------------
    // Sync external changes.
    //
    // In deferred mode, if the user has an unsaved change staged
    // (file OR removal), do NOT clobber the local preview with the
    // parent's `currentImage`.
    // ---------------------------------------------------------
    useEffect(() => {
      if (multiple) {
        const next =
          currentImages && currentImages.length > 0
            ? currentImages
            : currentImage
            ? [currentImage]
            : [];

        setImages((prev) => {
          if (
            prev.length === next.length &&
            prev.every((v, i) => v === next[i])
          ) {
            return prev;
          }
          return next;
        });
      } else {
        if (deferred && (stagedFileRef.current || removedStagedRef.current)) {
          return;
        }

        setSinglePreview((prev) => {
          const next = currentImage || null;
          if (prev === next) return prev;
          return next;
        });
      }
    }, [currentImage, currentImages, multiple, deferred]);

    // ---------------------------------------------------------
    // Image processing (unchanged)
    // ---------------------------------------------------------
    const processRaster = (file: File): Promise<File> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;

          img.onload = () => {
            try {
              let width = img.width;
              let height = img.height;
              const maxSize = maxDimension;

              if (width > height) {
                if (width > maxSize) {
                  height = Math.round((height * maxSize) / width);
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = Math.round((width * maxSize) / height);
                  height = maxSize;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
              }

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);

              const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
              const byteString = atob(webpDataUrl.split(',')[1]);
              const mimeString = webpDataUrl
                .split(',')[0]
                .split(':')[1]
                .split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const blob = new Blob([ab], { type: mimeString });

              if (blob.size > 2 * 1024 * 1024) {
                const compressedDataUrl = canvas.toDataURL(
                  'image/webp',
                  0.5,
                );
                const cbs = atob(compressedDataUrl.split(',')[1]);
                const cab = new ArrayBuffer(cbs.length);
                const cia = new Uint8Array(cab);
                for (let i = 0; i < cbs.length; i++) {
                  cia[i] = cbs.charCodeAt(i);
                }
                const cBlob = new Blob([cab], { type: 'image/webp' });
                if (cBlob.size > 2 * 1024 * 1024) {
                  reject(
                    new Error(
                      'Image is too large even after compression. Please use a smaller image.',
                    ),
                  );
                  return;
                }
                resolve(
                  new File(
                    [cBlob],
                    file.name.replace(/\.[^.]+$/, '.webp'),
                    {
                      type: 'image/webp',
                      lastModified: Date.now(),
                    },
                  ),
                );
                return;
              }

              resolve(
                new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                  type: 'image/webp',
                  lastModified: Date.now(),
                }),
              );
            } catch (err) {
              reject(err);
            }
          };

          img.onerror = () => reject(new Error('Failed to load image'));
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
      });
    };

    const processImage = async (file: File): Promise<File> => {
      if (isSvgFile(file)) return file;
      return processRaster(file);
    };

    // ---------------------------------------------------------
    // GitHub upload (unchanged)
    // ---------------------------------------------------------
    const uploadToGitHub = async (file: File): Promise<string> => {
      if (!supabase) {
        throw new Error(
          'Image upload is not configured. Please contact support.',
        );
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(',');
          resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const { data, error: invokeError } = await supabase.functions.invoke(
        'upload-to-github',
        {
          body: { content: base64, filename: file.name, folder },
        },
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Upload failed');
      }

      const result = data as {
        success?: boolean;
        url?: string;
        error?: string;
      };

      if (!result?.success || !result.url) {
        throw new Error(result?.error || 'Upload failed');
      }

      return result.url;
    };

    // ---------------------------------------------------------
    // Imperative handle (used only in deferred mode)
    // ---------------------------------------------------------
    useImperativeHandle(
      ref,
      (): ImageUploadHandle => ({
        hasPending: () => hasPending,

        discard: () => {
          if (stagedPreviewRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(stagedPreviewRef.current);
          }
          stagedPreviewRef.current = null;
          stagedFileRef.current = null;
          removedStagedRef.current = false;
          setHasPending(false);
          setSinglePreview(currentImage || null);
          setError(null);
        },

        upload: async () => {
          // Case 1: the user removed the current image and pressed Save.
          // Return '' so the parent persists an empty value (which the
          // RPC will NULLIF to NULL on the column).
          if (removedStagedRef.current) {
            removedStagedRef.current = false;
            setHasPending(false);
            return '';
          }

          // Case 2: nothing staged. Return the current preview so the
          // parent can persist it verbatim (usually a no-op).
          const file = stagedFileRef.current;
          if (!file) {
            return singlePreview ?? null;
          }

          // Case 3: a fresh file is staged - upload it.
          setUploading(true);
          setError(null);
          setUploadProgress(30);

          try {
            const processed = await processImage(file);
            setUploadProgress(80);
            const url = await uploadToGitHub(processed);
            setUploadProgress(100);

            setSinglePreview(url);
            if (stagedPreviewRef.current?.startsWith('blob:')) {
              URL.revokeObjectURL(stagedPreviewRef.current);
            }
            stagedPreviewRef.current = null;
            stagedFileRef.current = null;
            setHasPending(false);

            onImageUploaded?.(url);
            return url;
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Failed to upload image.',
            );
            return null;
          } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 800);
          }
        },
      }),
      [hasPending, singlePreview, currentImage, onImageUploaded],
    );

    // ---------------------------------------------------------
    // File select
    // ---------------------------------------------------------
    const handleFileSelect = async (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const maxBytes = maxFileSizeMB * 1024 * 1024;

      for (const f of files) {
        const isImage = f.type.startsWith('image/') || isSvgFile(f);
        if (!isImage) {
          setError('Please select image files only');
          return;
        }

        if (isSvgFile(f)) {
          if (f.size > SVG_MAX_BYTES) {
            setError(
              `SVG files must be under 500 KB (${f.name} is ${(
                f.size / 1024
              ).toFixed(1)} KB)`,
            );
            return;
          }
        } else {
          if (f.size > maxBytes) {
            setError(
              `Each image must be < ${maxFileSizeMB}MB (${f.name} is ${(
                f.size /
                (1024 * 1024)
              ).toFixed(2)}MB)`,
            );
            return;
          }
        }
      }

      // DEFERRED, SINGLE MODE - stage only.
      if (deferred && !multiple) {
        const file = files[0];

        if (stagedPreviewRef.current?.startsWith('blob:')) {
          URL.revokeObjectURL(stagedPreviewRef.current);
        }

        // Picking a new file cancels any staged removal.
        removedStagedRef.current = false;

        stagedFileRef.current = file;
        const objectUrl = URL.createObjectURL(file);
        stagedPreviewRef.current = objectUrl;

        setSinglePreview(objectUrl);
        setHasPending(true);
        setError(null);
        setShowUrlInput(false);

        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Non-deferred / multi mode - upload immediately (unchanged).
      if (multiple) {
        const remaining = maxImages - images.length;
        if (files.length > remaining) {
          setError(
            `You can upload up to ${maxImages} images (${remaining} slot${
              remaining === 1 ? '' : 's'
            } left)`,
          );
          return;
        }
      }

      setError(null);
      setUploading(true);
      setShowUrlInput(false);
      setUploadProgress(10);

      try {
        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const processed = await processImage(file);
          setUploadProgress(
            30 + Math.round(((i + 1) / files.length) * 60),
          );
          const url = await uploadToGitHub(processed);
          uploadedUrls.push(url);
        }

        setUploadProgress(100);

        if (multiple) {
          let next: string[];

          if (
            replacePrimaryOnAdd &&
            images.length > 0 &&
            uploadedUrls.length > 0
          ) {
            const [newPrimary, ...remainingNew] = uploadedUrls;
            const existingGallery = images.slice(1);
            next = [newPrimary, ...existingGallery, ...remainingNew];
          } else {
            next = [...images, ...uploadedUrls];
          }

          next = next.slice(0, maxImages);
          setImages(next);
          onImagesUploaded?.(next);
        } else {
          const url = uploadedUrls[0];
          setSinglePreview(url);
          onImageUploaded?.(url);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to upload image.',
        );
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setUploadProgress(0), 800);
      }
    };

    const handleUrlSubmit = () => {
      const url = imageUrlInput.trim();
      if (!url) {
        setError('Please enter an image URL');
        return;
      }
      try {
        new URL(url);
      } catch {
        setError('Please enter a valid URL');
        return;
      }

      setError(null);

      if (multiple) {
        if (images.length >= maxImages) {
          setError(`You can upload up to ${maxImages} images`);
          return;
        }

        let next: string[];
        if (replacePrimaryOnAdd && images.length > 0) {
          const existingGallery = images.slice(1);
          next = [url, ...existingGallery];
        } else {
          next = [...images, url];
        }
        next = next.slice(0, maxImages);
        setImages(next);
        onImagesUploaded?.(next);
      } else {
        if (deferred) {
          if (stagedPreviewRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(stagedPreviewRef.current);
          }
          stagedPreviewRef.current = url;
          stagedFileRef.current = null;
          removedStagedRef.current = false;
          setHasPending(true);
          setSinglePreview(url);
        } else {
          setSinglePreview(url);
          onImageUploaded?.(url);
        }
      }
      setImageUrlInput('');
      setShowUrlInput(false);
    };

    // ---------------------------------------------------------
    // REMOVE - the corrected handler
    //
    // Non-deferred: immediate removal, notify parent.
    // Deferred:     stage a removal, mark pending, let Save commit it.
    // ---------------------------------------------------------
    const handleRemoveSingle = () => {
      if (stagedPreviewRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(stagedPreviewRef.current);
      }
      stagedPreviewRef.current = null;
      stagedFileRef.current = null;

      if (deferred) {
        // Stage the removal. The preview goes empty immediately so
        // the user sees the effect; the parent's `currentImage` is
        // intentionally NOT cleared yet - Save commits it.
        removedStagedRef.current = true;
        setHasPending(true);
      } else {
        removedStagedRef.current = false;
        // Immediate mode: notify the parent right away so it can
        // persist the empty value.
        onImageUploaded?.('');
      }

      setSinglePreview(null);
      setShowUrlInput(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveAt = (index: number) => {
      const next = images.filter((_, i) => i !== index);
      setImages(next);
      onImagesUploaded?.(next);
    };

    const moveImage = (from: number, to: number) => {
      if (from === to) return;
      const next = [...images];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setImages(next);
      onImagesUploaded?.(next);
    };

    const renderProgress = (isUploading: boolean, progress: number) => {
      if (!isUploading || progress <= 0) return null;
      return (
        <div className={local.progressWrap}>
          <div className={local.progressBar}>
            <div
              className={local.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={local.progressText}>
            {progress < 30
              ? 'Processing...'
              : progress < 90
              ? 'Uploading...'
              : 'Done!'}
          </span>
        </div>
      );
    };

    const renderUrlInput = (submitLabel: string) => (
      <div className={local.urlInputContainer}>
        <input
          type="text"
          value={imageUrlInput}
          onChange={(e) => {
            setImageUrlInput(e.target.value);
            setError(null);
          }}
          placeholder="https://example.com/image.jpg"
          className={local.urlInput}
          autoFocus
        />
        <div className={local.urlActions}>
          <Button size="sm" onClick={handleUrlSubmit}>
            {submitLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowUrlInput(false);
              setError(null);
              setImageUrlInput('');
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );

    if (!multiple) {
      return (
        <div className={local.container}>
          <label className={local.label}>{label}</label>

          <div className={local.area}>
            {singlePreview ? (
              <div className={local.singlePreview}>
                <img
                  src={singlePreview}
                  alt="Preview"
                  className={local.singlePreviewImg}
                  onError={() => {
                    // Blob previews can't 404. If the committed URL
                    // does, revert and tell the user.
                    if (stagedPreviewRef.current === singlePreview) return;
                    setSinglePreview(null);
                    setError(
                      'The saved image could not be loaded. Please re-upload.',
                    );
                  }}
                />
                <IconButton
                  variant="danger"
                  size="md"
                  shape="circle"
                  aria-label="Remove image"
                  className={local.singleRemoveBtn}
                  onClick={handleRemoveSingle}
                >
                  <CloseIcon width={16} height={16} fill="#fff" />
                </IconButton>
              </div>
            ) : showUrlInput ? (
              renderUrlInput('Use URL')
            ) : (
              <div className={local.placeholder}>
                <div className={local.placeholderActions}>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploading}
                  >
                    Upload
                  </Button>
                  <span className={local.divider}>or</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowUrlInput(true)}
                  >
                    Add URL
                  </Button>
                </div>
                <span className={local.hintText}>
                  Max {maxFileSizeMB}MB . Supports JPG, PNG, WebP, SVG
                </span>
              </div>
            )}
          </div>

          {renderProgress(uploading, uploadProgress)}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/svg+xml"
            onChange={handleFileSelect}
            className={local.hiddenFile}
            disabled={uploading}
          />

          {error && (
            <Banner variant="error" inline onDismiss={() => setError(null)}>
              {error}
            </Banner>
          )}
        </div>
      );
    }

    const canAddMore = images.length < maxImages;

    return (
      <div className={local.container}>
        <label className={local.label}>
          {label}{' '}
          <span className={local.multiCount}>
            ({images.length}/{maxImages})
          </span>
        </label>

        <div className={local.multiGrid}>
          {images.map((src, idx) => (
            <div key={`${src}-${idx}`} className={local.tile}>
              <img src={src} alt={`Image ${idx + 1}`} />

              {idx === 0 && (
                <span className={local.primaryBadge} title="Primary image">
                  Primary
                </span>
              )}

              <div className={local.tileActions}>
                {idx > 0 && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    shape="circle"
                    className={local.tileBtn}
                    aria-label="Move left"
                    onClick={() => moveImage(idx, idx - 1)}
                  >
                    <span className={local.tileArrow}>
                      <LeftArrowIcon
                        width={18}
                        height={18}
                        fill="#4d4d4d"
                      />
                    </span>
                  </IconButton>
                )}
                {idx < images.length - 1 && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    shape="circle"
                    className={local.tileBtn}
                    aria-label="Move right"
                    onClick={() => moveImage(idx, idx + 1)}
                  >
                    <RightArrow width={14} height={14} fill="#fff" />
                  </IconButton>
                )}
                <IconButton
                  variant="danger"
                  size="sm"
                  shape="circle"
                  className={local.tileRemoveBtn}
                  aria-label="Remove"
                  onClick={() => handleRemoveAt(idx)}
                >
                  <CloseIcon width={12} height={12} fill="#fff" />
                </IconButton>
              </div>
            </div>
          ))}

          {canAddMore && (
            <button
              type="button"
              className={local.addTile}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <span className={local.addPlus}>+</span>
              <span className={local.addLabel}>
                {uploading ? 'Uploading...' : 'Add'}
              </span>
            </button>
          )}
        </div>

        <div className={local.multiActions}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowUrlInput((s) => !s)}
            disabled={uploading || !canAddMore}
          >
            + Add by URL
          </Button>
        </div>

        {showUrlInput && renderUrlInput('Add')}

        {renderProgress(uploading, uploadProgress)}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/svg+xml"
          multiple
          onChange={handleFileSelect}
          className={local.hiddenFile}
          disabled={uploading}
        />

        {error && (
          <Banner variant="error" inline onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <small className={local.multiHint}>
          First image is used as the menu thumbnail. Drag arrows to reorder.
        </small>
      </div>
    );
  },
);

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;