import EditorPage from '@/components/editor/editor-page';
import ScreenSizeGuard from '@/components/ui/screen-size-guard';
import { Toaster } from '@/components/ui/sonner';
import 'zod-metadata/register';

export function App() {
  return (
    <>
      <ScreenSizeGuard>
        <EditorPage />
      </ScreenSizeGuard>
      <Toaster />
    </>
  );
}
