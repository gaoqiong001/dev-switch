import { Toaster as SonnerToaster } from 'sonner';
import { Theme } from '../../types';

export default function Toaster({ theme }: { theme: Theme }) {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      theme={theme}
      toastOptions={{ duration: 3000 }}
    />
  );
}
