// components/Admin/ImageUpload.tsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './ImageUpload.module.scss';
import { CloseIcon } from '../../assets/svgs';
import { config } from '../../config/env';

interface ImageUploadProps {
  /** Single-image mode callback. */
  onImageUploaded?: (imageUrl: string) => void;
  /** Multi-image mode callback. */
  onImagesUploaded?: (images: string[]) => void;
  /** Single-mode initial image. */
  currentImage?: string;
  /** Multi-mode initial images. */
  currentImages?: string[];
  label?: string;
  /** Enable multi-image mode. */
  multiple?: boolean;
  /** Max number of images in multiple mode. Default 6. */
  maxImages?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onImagesUploaded,
  currentImage = '',
  currentImages = [],
  label = 'Upload Image',
  multiple = false,
  maxImages = 6,
}) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external changes
  useEffect(() => {
    if (multiple) {
      setImages(
        currentImages && currentImages.length > 0
          ? currentImages
          : currentImage
          ? [currentImage]
          : [],
      );
    } else {
      setSinglePreview(currentImage || null);
    }
  }, [currentImage, currentImages, multiple]);

  const IMG_API_KEY = config.imgApiKey;

  // -------- Image processing (unchanged) --------
  const processImage = (file: File): Promise<File> => {
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
            const maxSize = 1024;

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
              const compressedDataUrl = canvas.toDataURL('image/webp', 0.5);
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
                new File([cBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
                  type: 'image/webp',
                  lastModified: Date.now(),
                }),
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

  const uploadToIMG = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${IMG_API_KEY}`,
      { method: 'POST', body: formData },
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || 'Upload failed');
    return `${data.data.url}?w=640`;
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate each
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        setError('Please select image files only');
        return;
      }
      if (f.size > 2 * 1024 * 1024) {
        setError(
          `Each image must be < 2MB (${f.name} is ${(f.size / (1024 * 1024)).toFixed(2)}MB)`,
        );
        return;
      }
    }

    if (multiple) {
      const remaining = maxImages - images.length;
      if (files.length > remaining) {
        setError(
          `You can upload up to ${maxImages} images (${remaining} slot${remaining === 1 ? '' : 's'} left)`,
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
        const url = await uploadToIMG(processed);
        uploadedUrls.push(url);
      }

      setUploadProgress(100);

      if (multiple) {
        const next = [...images, ...uploadedUrls].slice(0, maxImages);
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
      const next = [...images, url].slice(0, maxImages);
      setImages(next);
      onImagesUploaded?.(next);
    } else {
      setSinglePreview(url);
      onImageUploaded?.(url);
    }
    setImageUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemoveSingle = () => {
    setSinglePreview(null);
    onImageUploaded?.('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowUrlInput(false);
    setUploadProgress(0);
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

  // =========================================================
  // Render — SINGLE
  // =========================================================
  if (!multiple) {
    return (
      <div className={styles.imageUploadContainer}>
        <label className={styles.imageUploadLabel}>{label}</label>

        <div className={styles.imageUploadArea}>
          {singlePreview ? (
            <div className={styles.imagePreviewWrapper}>
              <img
                src={singlePreview}
                alt="Preview"
                className={styles.imagePreview}
              />
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={handleRemoveSingle}
                title="Remove image"
              >
                <CloseIcon width={18} height={18} fill="#fff" />
              </button>
            </div>
          ) : (
            <>
              {showUrlInput ? (
                <div className={styles.urlInputContainer}>
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => {
                      setImageUrlInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className={styles.urlInput}
                    autoFocus
                  />
                  <div className={styles.urlActions}>
                    <button
                      type="button"
                      className={styles.urlSubmitBtn}
                      onClick={handleUrlSubmit}
                    >
                      Use URL
                    </button>
                    <button
                      type="button"
                      className={styles.urlCancelBtn}
                      onClick={() => {
                        setShowUrlInput(false);
                        setError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.uploadPlaceholder}>
                  <div className={styles.uploadOptions}>
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? 'Processing...' : 'Upload'}
                    </button>
                    <span className={styles.uploadDivider}>or</span>
                    <button
                      type="button"
                      className={styles.urlBtn}
                      onClick={() => setShowUrlInput(true)}
                    >
                      Add URL
                    </button>
                  </div>
                  <span className={styles.uploadHint}>
                    Max Image Uploadable Size 2MB
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {uploading && uploadProgress > 0 && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className={styles.progressText}>Uploading…</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className={styles.hiddenFileInput}
          disabled={uploading}
        />

        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }

  // =========================================================
  // Render — MULTI
  // =========================================================
  const canAddMore = images.length < maxImages;

  return (
    <div className={styles.imageUploadContainer}>
      <label className={styles.imageUploadLabel}>
        {label}{' '}
        <span className={styles.multiCount}>
          ({images.length}/{maxImages})
        </span>
      </label>

      <div className={styles.multiGrid}>
        {images.map((src, idx) => (
          <div key={`${src}-${idx}`} className={styles.multiTile}>
            <img src={src} alt={`Image ${idx + 1}`} />

            {idx === 0 && (
              <span className={styles.primaryBadge} title="Primary image">
                Primary
              </span>
            )}

            <div className={styles.multiTileActions}>
              {idx > 0 && (
                <button
                  type="button"
                  className={styles.tileMoveBtn}
                  onClick={() => moveImage(idx, idx - 1)}
                  title="Move left"
                  aria-label="Move left"
                >
                  ←
                </button>
              )}
              {idx < images.length - 1 && (
                <button
                  type="button"
                  className={styles.tileMoveBtn}
                  onClick={() => moveImage(idx, idx + 1)}
                  title="Move right"
                  aria-label="Move right"
                >
                  →
                </button>
              )}
              <button
                type="button"
                className={styles.tileRemoveBtn}
                onClick={() => handleRemoveAt(idx)}
                title="Remove"
                aria-label="Remove"
              >
                <CloseIcon width={12} height={12} fill="#fff" />
              </button>
            </div>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            className={styles.addTile}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <span className={styles.addTilePlus}>+</span>
            <span className={styles.addTileLabel}>
              {uploading ? 'Uploading…' : 'Add'}
            </span>
          </button>
        )}
      </div>

      <div className={styles.multiActions}>
        <button
          type="button"
          className={styles.urlBtnSmall}
          onClick={() => setShowUrlInput((s) => !s)}
          disabled={uploading || !canAddMore}
        >
          + Add by URL
        </button>
      </div>

      {showUrlInput && (
        <div className={styles.urlInputContainer}>
          <input
            type="text"
            value={imageUrlInput}
            onChange={(e) => {
              setImageUrlInput(e.target.value);
              setError(null);
            }}
            placeholder="https://example.com/image.jpg"
            className={styles.urlInput}
            autoFocus
          />
          <div className={styles.urlActions}>
            <button
              type="button"
              className={styles.urlSubmitBtn}
              onClick={handleUrlSubmit}
            >
              Add
            </button>
            <button
              type="button"
              className={styles.urlCancelBtn}
              onClick={() => {
                setShowUrlInput(false);
                setError(null);
                setImageUrlInput('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {uploading && uploadProgress > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {uploadProgress < 30
              ? 'Processing…'
              : uploadProgress < 90
              ? 'Uploading…'
              : 'Done!'}
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className={styles.hiddenFileInput}
        disabled={uploading}
      />

      {error && <span className={styles.errorText}>{error}</span>}

      <small className={styles.multiHint}>
        First image is used as the menu thumbnail. Drag arrows to reorder.
      </small>
    </div>
  );
};

export default ImageUpload;