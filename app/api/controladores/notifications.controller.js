// Controlador de notificaciones (suscribe observers a NotificationCenter)

const NotificationsController = {
    initialize() {
        try {
            const emailObserver = new EmailNotificationObserver('EmailService');
            const webObserver = new WebNotificationObserver('WebNotifications');
            NotificationCenter.subscribe('nueva_factura', emailObserver);
            NotificationCenter.subscribe('nueva_factura', webObserver);
            NotificationCenter.subscribe('orden_actualizada', emailObserver);
            NotificationCenter.subscribe('orden_actualizada', webObserver);
            NotificationCenter.subscribe('pago_procesado', emailObserver);
            NotificationCenter.subscribe('pago_procesado', webObserver);
        } catch (e) {
            console.warn('NotificationsController: modelos de observer no disponibles todavía.');
        }
    }
};