import { useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';

interface UseCourseCopyPasteProtectionOptions {
  enabled?: boolean;
  message?: string;
  allowContextClick?: boolean;
}

/**
 * Enforces course integrity by preventing copy, cut, and paste operations
 * across course learning materials, quizzes, and coding exercises.
 */
export const useCourseCopyPasteProtection = ({
  enabled = true,
  message = 'Copy and paste are not allowed in course content. Please type code manually to practice.',
  allowContextClick = false,
}: UseCourseCopyPasteProtectionOptions = {}) => {
  const { error } = useToast();
  const lastToastTimeRef = useRef<number>(0);

  const notifyBlocked = (action: 'copy' | 'paste' | 'cut' | 'contextmenu') => {
    const now = Date.now();
    // Throttle notifications to at most once every 1.5 seconds so we don't flood the UI
    if (now - lastToastTimeRef.current > 1500) {
      lastToastTimeRef.current = now;
      if (action === 'copy') {
        error('Copying is not allowed in course materials. Type code manually to retain learning!');
      } else if (action === 'paste') {
        error('Pasting is not allowed in course exercises. Please write your code manually!');
      } else if (action === 'cut') {
        error('Cutting is not allowed in course materials.');
      } else {
        error(message);
      }
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      notifyBlocked('copy');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      notifyBlocked('cut');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      notifyBlocked('paste');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Ctrl/Cmd + C (Copy)
      if (isModifier && key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('copy');
      }
      // Ctrl/Cmd + V (Paste) or Shift + Insert (Paste)
      else if ((isModifier && key === 'v') || (e.shiftKey && e.key === 'Insert')) {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('paste');
      }
      // Ctrl/Cmd + X (Cut)
      else if (isModifier && key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('cut');
      }
      // Ctrl + Insert (Copy)
      else if (isModifier && e.key === 'Insert') {
        e.preventDefault();
        e.stopPropagation();
        notifyBlocked('copy');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!allowContextClick) {
        // Prevent default right-click menu which gives browser "Copy" / "Paste"
        e.preventDefault();
        notifyBlocked('contextmenu');
      }
    };

    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('cut', handleCut, true);
    window.addEventListener('paste', handlePaste, true);
    window.addEventListener('keydown', handleKeyDown, true);
    if (!allowContextClick) {
      window.addEventListener('contextmenu', handleContextMenu, true);
    }

    return () => {
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('cut', handleCut, true);
      window.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (!allowContextClick) {
        window.removeEventListener('contextmenu', handleContextMenu, true);
      }
    };
  }, [enabled, message, allowContextClick]);
};
