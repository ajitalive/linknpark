import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm dialog.
 *
 * react-native-web silently drops the buttons of a multi-button
 * Alert.alert, so confirmations built with it do nothing on web.
 * On native this delegates to Alert.alert unchanged; on web it uses
 * the browser's built-in confirm().
 */
export function confirmAction(opts: {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    const text = opts.message ? `${opts.title}\n\n${opts.message}` : opts.title;
    if (window.confirm(text)) opts.onConfirm();
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: 'Cancel', style: 'cancel' },
    { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: opts.onConfirm },
  ]);
}
