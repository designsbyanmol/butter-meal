// src/components/Admin/ImageUpload.tsx
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Button, IconButton, Banner } from '../ui';
import { CloseIcon, LeftArrowIcon, RightArrow } from '../../assets/svgs';
import { supabase } from '../../services/supabase.client';
import local from './ImageUpload.module.scss';

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------
//
// `upload()` (from the imperative handle) resolves to:
//   • a URL string  - persist this URL
//   • ''            - clear the stored value (user removed the image)
//   • null          - upload failed (an error banner is already shown)
//   • undefined     - the component isn't mounted
//
// ---------------------------------------------------------------------------

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
  /**
   * When true and `multiple`, adding a new image pushes it to index 0 and
   * keeps the previous primary in the gallery.
   */
  replacePrimaryOnAdd?: boolean;
  /**
   * When true, picking a file does not upload immediately. The file is
   * held locally as a preview and only pushed to GitHub when the parent
   * calls `upload()` via the imperative handle. Use this for modals that
   * have an explicit Save button.
   */
  deferred?: boolean;
  /**
   * Called whenever the "staged and not yet uploaded" state flips. The
   * parent can wire this to a Save button's `disabled` prop. Only
   * meaningful in deferred mode.
   */
  onPendingChange?: (pending: boolean) => void;
}

export interface ImageUploadHandle {
  upload: () => Promise<string | null>;
  hasPending: () => boolean;
  discard: () => void;
}

const SVG_MAX_BYTES = 512 * 1024;

const isSvgFile = (file: File): boolean =>
  file.type === 'image/svg+xml' ||
  file.name.toLowerCase().endsWith('.svg');

// ---------------------------------------------------------------------------
// Raster compression: shrink to maxDimension, encode as WebP
// ---------------------------------------------------------------------------
const processRaster = (file: File, maxDimension: number): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
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

          const blobFromDataUrl = (dataUrl: string): Blob => {
            const byteString = atob(dataUrl.split(',')[1]);
            const mimeString = dataUrl
              .split(',')[0]
              .split(':')[1]
              .split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
          };

          let blob = blobFromDataUrl(canvas.toDataURL('image/webp', 0.8));

          if (blob.size > 2 * 1024 * 1024) {
            blob = blobFromDataUrl(canvas.toDataURL('image/webp', 0.5));
            if (blob.size > 2 * 1024 * 1024) {
              reject(
                new Error(
                  'Image is too large even after compression. Please use a smaller image.',
                ),
              );
              return;
            }
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

const processImage = (file: File, maxDimension: number): Promise<File> => {
  if (isSvgFile(file)) return Promise.resolve(file);
  return processRaster(file, maxDimension);
};

// ---------------------------------------------------------------------------
// GitHub upload via the `upload-to-github` edge function
// ---------------------------------------------------------------------------
const uploadToGitHub = async (file: File, folder: string): Promise<string> => {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
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
    // ---- Committed state (synced from parent props) ----
    const [images, setImages] = useState<string[]>(() =>
      multiple
        ? currentImages.length > 0
          ? currentImages
          : currentImage
            ? [currentImage]
            : []
        : [],
    );
    const [singlePreview, setSinglePreview] = useState<string | null>(
      multiple ? null : currentImage || null,
    );

    // ---- UI state ----
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    // ---- Deferred-mode staging ----
    const stagedFileRef = useRef<File | null>(null);
    const stagedPreviewRef = useRef<string | null>(null);
    const removedStagedRef = useRef(false);
    const [hasPending, setHasPending] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Notify parent on pending change
    useEffect(() => {
      onPendingChange?.(hasPending);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasPending]);

    // Clean up staged object URL on unmount
    useEffect(() => {
      return () => {
        if (stagedPreviewRef.current?.startsWith('blob:')) {
          URL.revokeObjectURL(stagedPreviewRef.current);
        }
      };
    }, []);

    // ---------------------------------------------------------
    // Sync external state.
    //
    // In deferred mode, if the user has an unsaved change staged,
    // do NOT clobber the local preview with the parent's value.
    // ---------------------------------------------------------
    useEffect(() => {
      if (multiple) {
        const next =
          currentImages.length > 0
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
          return prev === next ? prev : next;
        });
      }
    }, [currentImage, currentImages, multiple, deferred]);

    // ---------------------------------------------------------
    // Imperative handle
    //
    // Deps intentionally include only the state the handle reads
    // (`hasPending`, `singlePreview`, `currentImage`), not the
    // callbacks — otherwise the handle is rebuilt on every render,
    // and callers that stored the ref lose their reference.
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
          // Case 1 — the user removed the current image and pressed Save.
          if (removedStagedRef.current) {
            removedStagedRef.current = false;
            setHasPending(false);
            setSinglePreview(null);
            return '';
          }

          // Case 2 — nothing staged. Return whatever's already committed.
          const file = stagedFileRef.current;
          if (!file) {
            return singlePreview ?? null;
          }

          // Case 3 — a fresh file is staged. Upload it.
          setUploading(true);
          setError(null);
          setUploadProgress(30);

          try {
            const processed = await processImage(file, maxDimension);
            setUploadProgress(80);
            const url = await uploadToGitHub(processed, folder);
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
            window.setTimeout(() => setUploadProgress(0), 800);
          }
        },
      }),
      [hasPending, singlePreview, currentImage, maxDimension, folder],
    );

    // ---------------------------------------------------------
    // File select handler
    // ---------------------------------------------------------
    const handleFileSelect = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const maxBytes = maxFileSizeMB * 1024 * 1024;

        // Validate
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
          } else if (f.size > maxBytes) {
            setError(
              `Each image must be < ${maxFileSizeMB}MB (${f.name} is ${(
                f.size /
                (1024 * 1024)
              ).toFixed(2)}MB)`,
            );
            return;
          }
        }

        // ---- Deferred single mode: stage only ----
        if (deferred && !multiple) {
          const file = files[0];

          if (stagedPreviewRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(stagedPreviewRef.current);
          }
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

        // ---- Multi mode: check capacity ----
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

        // ---- Immediate upload ----
        setError(null);
        setUploading(true);
        setShowUrlInput(false);
        setUploadProgress(10);

        try {
          const uploadedUrls: string[] = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const processed = await processImage(file, maxDimension);
            setUploadProgress(
              30 + Math.round(((i + 1) / files.length) * 60),
            );
            const url = await uploadToGitHub(processed, folder);
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
              const [newPrimary, ...rest] = uploadedUrls;
              const existingGallery = images.slice(1);
              next = [newPrimary, ...existingGallery, ...rest];
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
          window.setTimeout(() => setUploadProgress(0), 800);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        deferred,
        multiple,
        maxImages,
        maxFileSizeMB,
        maxDimension,
        folder,
        images,
        replacePrimaryOnAdd,
      ],
    );

    // ---------------------------------------------------------
    // URL entry (paste an image URL instead of uploading)
    // ---------------------------------------------------------
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
          next = [url, ...images.slice(1)];
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
    // Remove handlers
    // ---------------------------------------------------------
    const handleRemoveSingle = () => {
      if (stagedPreviewRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(stagedPreviewRef.current);
      }
      stagedPreviewRef.current = null;
      stagedFileRef.current = null;

      if (deferred) {
        removedStagedRef.current = true;
        setHasPending(true);
      } else {
        removedStagedRef.current = false;
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

    // ---------------------------------------------------------
    // Shared render helpers
    // ---------------------------------------------------------
    const renderProgress = () => {
      if (!uploading || uploadProgress <= 0) return null;
      return (
        <div className={local.progressWrap}>
          <div className={local.progressBar}>
            <div
              className={local.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={local.progressText}>
            {uploadProgress < 30
              ? 'Processing...'
              : uploadProgress < 90
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

    // ---------------------------------------------------------
    // Single-image render
    // ---------------------------------------------------------
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
                  Max {maxFileSizeMB}MB - Supports JPG, PNG, WebP, SVG
                </span>
              </div>
            )}
          </div>

          {renderProgress()}

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

    // ---------------------------------------------------------
    // Multi-image render
    // ---------------------------------------------------------
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

        {renderProgress()}

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
          First image is used as the thumbnail. Drag arrows to reorder.
        </small>
      </div>
    );
  },
);

ImageUpload.displayName = 'ImageUpload';

export default ImageUpload;