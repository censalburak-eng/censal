/**
 * useModal — AppModal için kolayca state yönetimi sağlayan hook.
 *
 * Kullanım:
 *   const { show, hide, modalProps } = useModal();
 *
 *   show({
 *     title: 'Silmek istiyor musunuz?',
 *     message: 'Bu işlem geri alınamaz.',
 *     actions: [
 *       { label: 'Vazgeç', style: 'cancel', onPress: hide },
 *       { label: 'Sil', style: 'destructive', onPress: () => { sil(); hide(); } },
 *     ],
 *   });
 *
 *   return <AppModal {...modalProps} />;
 */

import { useState, useCallback } from 'react';
import type { AppModalProps, ModalAction } from '../components/ui/AppModal';

type ShowOptions = Omit<AppModalProps, 'visible' | 'onDismiss'>;

export function useModal() {
  const [options, setOptions] = useState<ShowOptions | null>(null);

  const show = useCallback((opts: ShowOptions) => {
    setOptions(opts);
  }, []);

  const hide = useCallback(() => {
    setOptions(null);
  }, []);

  const modalProps: AppModalProps = {
    visible: options !== null,
    onDismiss: hide,
    ...(options ?? {}),
  };

  return { show, hide, modalProps };
}

/** Tek seferlik basit uyarı – sadece "Tamam" butonu */
export function useSimpleAlert() {
  const { show, hide, modalProps } = useModal();

  const alert = useCallback(
    (title: string, message?: string, actions?: ModalAction[]) => {
      show({
        title,
        message,
        actions: actions ?? [{ label: 'Tamam', style: 'default', onPress: hide }],
      });
    },
    [show, hide]
  );

  return { alert, hide, modalProps };
}
