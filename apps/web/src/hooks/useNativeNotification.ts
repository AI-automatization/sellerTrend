export function useNativeNotification() {
  const isDesktop = !!window.ventraDesktop?.isDesktop;

  const notify = (title: string, body: string) => {
    if (window.ventraDesktop?.isDesktop) {
      window.ventraDesktop.notify(title, body);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (isDesktop) return true; // Desktop always has permission
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  };

  return { notify, isDesktop, requestPermission };
}
