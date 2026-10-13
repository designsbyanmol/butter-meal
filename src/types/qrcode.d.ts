// src/types/qrcode.d.ts
declare module 'qrcode' {
  export interface QrColorOptions {
    dark?: string;
    light?: string;
  }

  export interface QrRenderOptions {
    type?: 'svg' | 'utf8' | 'terminal' | 'png' | 'image/png';
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    scale?: number;
    width?: number;
    color?: QrColorOptions;
    version?: number;
  }

  export function toString(
    text: string,
    options?: QrRenderOptions,
  ): Promise<string>;

  export function toDataURL(
    text: string,
    options?: QrRenderOptions,
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: QrRenderOptions,
  ): Promise<void>;

  const QRCode: {
    toString: typeof toString;
    toDataURL: typeof toDataURL;
    toCanvas: typeof toCanvas;
  };

  export default QRCode;
}