declare module '@imgly/background-removal' {
  export interface Config {
    progress?: (key: string, current: number, total: number) => void;
    output?: {
      format?: 'image/png' | 'image/jpeg' | 'image/webp';
      quality?: number;
    };
    model?: 'small' | 'medium';
    device?: 'cpu' | 'gpu';
  }

  export function removeBackground(
    image: File | Blob | string | ImageData,
    config?: Config
  ): Promise<Blob>;
}
