// components/Admin/ImageUpload.tsx
import React, { useState, useRef, useEffect } from 'react';
import styles from './AdminPanel.module.scss';
import { CloseIcon } from '../../assets/svgs';
import { config } from '../../config/env';
interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImage?: string;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImage = '',
  label = 'Upload Image',
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(currentImage || '');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Sync preview + imageUrl when currentImage changes externally
  // (e.g., when the edit modal opens for a different item)
  useEffect(() => {
    setPreview(currentImage || null);
    setImageUrl(currentImage || '');
  }, [currentImage]);

  // IMG API Key
  const IMG_API_KEY = config.imgApiKey;

  // Image processing function: compress, convert to WebP, resize to max 1024x1024
  const processImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          try {
            // Calculate new dimensions (max 1024x1024, maintain aspect ratio)
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

            // Create canvas for processing
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            // Draw and resize image
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to WebP with 80% quality (good balance of size/quality)
            const webpDataUrl = canvas.toDataURL('image/webp', 0.8);
            
            // Convert data URL to Blob
            const byteString = atob(webpDataUrl.split(',')[1]);
            const mimeString = webpDataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([ab], { type: mimeString });
            
            // Check if compressed file is under 2MB
            if (blob.size > 2 * 1024 * 1024) {
              // If still too large, try compressing more
              const compressedDataUrl = canvas.toDataURL('image/webp', 0.5);
              const compressedByteString = atob(compressedDataUrl.split(',')[1]);
              const compressedAb = new ArrayBuffer(compressedByteString.length);
              const compressedIa = new Uint8Array(compressedAb);
              
              for (let i = 0; i < compressedByteString.length; i++) {
                compressedIa[i] = compressedByteString.charCodeAt(i);
              }
              
              const compressedBlob = new Blob([compressedAb], { type: 'image/webp' });
              
              if (compressedBlob.size > 2 * 1024 * 1024) {
                reject(new Error('Image is too large even after compression. Please use a smaller image.'));
                return;
              }
              
              // Create a new File object with compressed version
              const processedFile = new File(
                [compressedBlob], 
                file.name.replace(/\.[^.]+$/, '.webp'), 
                { type: 'image/webp', lastModified: Date.now() }
              );
              
              console.log(`✅ Image processed: ${file.size} bytes → ${compressedBlob.size} bytes (${Math.round((1 - compressedBlob.size / file.size) * 100)}% reduction)`);
              console.log(`📐 Dimensions: ${width}x${height}px`);
              
              resolve(processedFile);
              return;
            }
            
            // Create a new File object
            const processedFile = new File(
              [blob], 
              file.name.replace(/\.[^.]+$/, '.webp'), 
              { type: 'image/webp', lastModified: Date.now() }
            );
            
            console.log(`✅ Image processed: ${file.size} bytes → ${blob.size} bytes (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`);
            console.log(`📐 Dimensions: ${width}x${height}px`);
            
            resolve(processedFile);
          } catch (err) {
            reject(err);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      setError(`Image size must be less than 2MB (current: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }

    setError(null);
    setUploading(true);
    setShowUrlInput(false);
    setUploadProgress(10);

    try {
      // Show original preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setUploadProgress(30);

      // Process image: compress, convert to WebP, resize
      const processedFile = await processImage(file);
      
      setUploadProgress(60);

      // Upload to IMG
      const imageUrl = await uploadToIMG(processedFile);
      
      setUploadProgress(100);
      setImageUrl(imageUrl);
      onImageUploaded(imageUrl);
      
      console.log('✅ Image uploaded successfully to IMG:', imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const uploadToIMG = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_API_KEY}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Upload failed');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Upload failed');
  }

  const fullUrl: string = data.data.url;

  // ✅ Append a width hint so the browser downloads a smaller variant
  // Menu cards render at ~320 CSS px; 640 covers retina 2x.
  const optimizedUrl = `${fullUrl}?w=640`;

  // Optional: log the size difference for sanity
  console.log('imgbb original:', data.data.image?.url);
  console.log('Stored URL:', optimizedUrl);

  return optimizedUrl;
};

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }

    // Validate URL
    try {
      new URL(imageUrl);
      setError(null);
      setPreview(imageUrl);
      onImageUploaded(imageUrl);
      setShowUrlInput(false);
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setError(null);
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setImageUrl('');
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowUrlInput(false);
    setUploadProgress(0);
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.imageUploadContainer}>
      <label className={styles.imageUploadLabel}>{label}</label>
      
      <div className={styles.imageUploadArea}>
        {preview ? (
          <div className={styles.imagePreviewWrapper}>
            <img src={preview} alt="Preview" className={styles.imagePreview} />
            <button
              type="button"
              className={styles.removeImageBtn}
              onClick={handleRemoveImage}
              title="Remove image"
            >
              <CloseIcon width={18} height={18} fill='#fff'/>
            </button>
          </div>
        ) : (
          <>
            {showUrlInput ? (
              <div className={styles.urlInputContainer}>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={handleUrlChange}
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
                    Fill URL
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

      {/* Progress Bar */}
      {uploading && uploadProgress > 0 && (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {uploadProgress < 30 ? 'Processing image...' : 
             uploadProgress < 60 ? 'Compressing to WebP...' : 
             uploadProgress < 100 ? 'Uploading...' : 'Done!'}
          </span>
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
};

export default ImageUpload;