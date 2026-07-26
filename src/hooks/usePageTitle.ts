import { useSEO } from './useSEO';

export function usePageTitle(title: string) {
  useSEO(title);
}
