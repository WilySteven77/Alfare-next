// ===== PATRÓN OBSERVER - Para notificaciones automáticas =====

class NotificationCenter {
    constructor() {
        this.observers = new Map();
        this.eventHistory = [];
        this.subscriptions = new Map(); // Para tracking de suscripciones
    }

    // POST: Suscribir observer a un evento
    subscribe(event, observer, metadata = {}) {
        try {
            if (!event || !observer) {
                throw new Error('Evento y observer son requeridos');
            }

            if (!observer.update || typeof observer.update !== 'function') {
                throw new Error('Observer debe implementar método update()');
            }

            if (!this.observers.has(event)) {
                this.observers.set(event, []);
            }

            // Evitar duplicados
            const existingObservers = this.observers.get(event);
            if (existingObservers.some(obs => obs.observer === observer)) {
                throw new Error('Observer ya está suscrito a este evento');
            }

            const subscription = {
                observer,
                subscribedAt: new Date().toISOString(),
                metadata,
                id: Date.now() + Math.random()
            };

            existingObservers.push(subscription);
            
            // Tracking de suscripción
            if (!this.subscriptions.has(observer)) {
                this.subscriptions.set(observer, []);
            }
            this.subscriptions.get(observer).push({ event, subscriptionId: subscription.id });

            return {
                success: true,
                data: {
                    event,
                    observerId: subscription.id,
                    totalObservers: existingObservers.length
                },
                message: `Observer suscrito al evento: ${event}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'SUBSCRIPTION_FAILED'
            };
        }
    }

    // DELETE: Desuscribir observer de un evento
    unsubscribe(event, observer) {
        try {
            if (!this.observers.has(event)) {
                throw new Error(`No existe el evento: ${event}`);
            }

            const observers = this.observers.get(event);
            const initialLength = observers.length;
            
            // Filtrar el observer específico
            const filteredObservers = observers.filter(sub => sub.observer !== observer);
            
            if (filteredObservers.length === initialLength) {
                throw new Error('Observer no encontrado en este evento');
            }

            this.observers.set(event, filteredObservers);

            // Actualizar tracking
            if (this.subscriptions.has(observer)) {
                const subs = this.subscriptions.get(observer);
                const updatedSubs = subs.filter(sub => sub.event !== event);
                
                if (updatedSubs.length === 0) {
                    this.subscriptions.delete(observer);
                } else {
                    this.subscriptions.set(observer, updatedSubs);
                }
            }

            return {
                success: true,
                data: {
                    event,
                    remainingObservers: filteredObservers.length
                },
                message: `Observer desuscrito del evento: ${event}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'UNSUBSCRIPTION_FAILED'
            };
        }
    }

    // POST: Notificar evento a todos los observers suscritos
    notify(event, data, metadata = {}) {
        try {
            const eventLog = {
                event,
                data,
                metadata,
                timestamp: new Date().toISOString(),
                notificationId: Date.now() + Math.random()
            };

            if (!this.observers.has(event)) {
                eventLog.observersNotified = 0;
                eventLog.responses = [];
                this.eventHistory.push(eventLog);
                
                return {
                    success: true,
                    data: eventLog,
                    message: `No hay observers para el evento: ${event}`
                };
            }

            const observers = this.observers.get(event);
            const responses = [];
            let successCount = 0;
            let errorCount = 0;

            observers.forEach((subscription, index) => {
                try {
                    const response = subscription.observer.update(event, data);
                    responses.push({
                        observerId: subscription.id,
                        response,
                        status: 'success',
                        executedAt: new Date().toISOString()
                    });
                    successCount++;
                } catch (error) {
                    responses.push({
                        observerId: subscription.id,
                        error: error.message,
                        status: 'error',
                        executedAt: new Date().toISOString()
                    });
                    errorCount++;
                }
            });

            eventLog.observersNotified = observers.length;
            eventLog.responses = responses;
            eventLog.successCount = successCount;
            eventLog.errorCount = errorCount;
            
            this.eventHistory.push(eventLog);

            return {
                success: true,
                data: eventLog,
                message: `Evento ${event} notificado a ${observers.length} observers`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'NOTIFICATION_FAILED'
            };
        }
    }

    // GET: Obtener eventos disponibles
    getAvailableEvents() {
        return {
            success: true,
            data: {
                registeredEvents: Array.from(this.observers.keys()),
                totalEvents: this.observers.size,
                totalObservers: Array.from(this.observers.values()).reduce((sum, obs) => sum + obs.length, 0)
            }
        };
    }

    // GET: Obtener historial de eventos
    getEventHistory(limit = 50) {
        return {
            success: true,
            data: this.eventHistory.slice(-limit).reverse(),
            message: `Últimos ${Math.min(limit, this.eventHistory.length)} eventos`
        };
    }

    // GET: Obtener observers de un evento específico
    getEventObservers(event) {
        if (!this.observers.has(event)) {
            return {
                success: false,
                error: `Evento ${event} no encontrado`,
                code: 'EVENT_NOT_FOUND'
            };
        }

        const observers = this.observers.get(event);
        return {
            success: true,
            data: {
                event,
                observers: observers.map(sub => ({
                    id: sub.id,
                    subscribedAt: sub.subscribedAt,
                    metadata: sub.metadata,
                    observerName: sub.observer.name || sub.observer.constructor.name
                })),
                totalObservers: observers.length
            }
        };
    }

    // DELETE: Limpiar historial de eventos
    clearEventHistory() {
        const clearedCount = this.eventHistory.length;
        this.eventHistory = [];
        
        return {
            success: true,
            data: { clearedEvents: clearedCount },
            message: `Historial limpiado: ${clearedCount} eventos eliminados`
        };
    }

    // GET: Estadísticas del sistema de notificaciones
    getStatistics() {
        const stats = {
            totalEvents: this.observers.size,
            totalObservers: Array.from(this.observers.values()).reduce((sum, obs) => sum + obs.length, 0),
            totalNotifications: this.eventHistory.length,
            successfulNotifications: this.eventHistory.filter(h => h.errorCount === 0).length,
            failedNotifications: this.eventHistory.filter(h => h.errorCount > 0).length,
            mostActiveEvent: null,
            leastActiveEvent: null
        };

        // Calcular evento más activo
        if (this.eventHistory.length > 0) {
            const eventCounts = {};
            this.eventHistory.forEach(h => {
                eventCounts[h.event] = (eventCounts[h.event] || 0) + 1;
            });

            const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);
            stats.mostActiveEvent = { event: sortedEvents[0][0], count: sortedEvents[0][1] };
            stats.leastActiveEvent = { 
                event: sortedEvents[sortedEvents.length - 1][0], 
                count: sortedEvents[sortedEvents.length - 1][1] 
            };
        }

        return {
            success: true,
            data: stats
        };
    }

    // NUEVO: Método estático para compatibilidad con las pruebas
    static subscribe(event, observer) {
        return globalNotificationCenter.subscribe(event, observer).message;
    }

    static unsubscribe(event, observer) {
        return globalNotificationCenter.unsubscribe(event, observer).message;
    }

    static notify(event, data) {
        return globalNotificationCenter.notify(event, data).message;
    }

    static clear() {
        globalNotificationCenter.observers.clear();
        globalNotificationCenter.eventHistory = [];
        globalNotificationCenter.subscriptions.clear();
    }
}

// Observadores específicos mejorados
class EmailNotificationObserver {
    constructor(name, config = {}) {
        this.name = name || 'EmailService';
        this.config = {
            retryAttempts: 3,
            timeout: 5000,
            ...config
        };
        this.sentEmails = [];
    }

    update(event, data) {
        const emailData = {
            id: Date.now(),
            event,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        try {
            let message = '';
            let subject = '';

            switch (event) {
                case 'nueva_factura':
                    subject = `Nueva Factura #${data.id}`;
                    message = `[EMAIL] Nueva factura #${data.id} por $${data.monto} generada para cliente ${data.clienteId}`;
                    emailData.to = `cliente_${data.clienteId}@alfared.com`;
                    break;
                    
                case 'orden_actualizada':
                    subject = `Orden ${data.ordenId} Actualizada`;
                    message = `[EMAIL] Orden #${data.ordenId} actualizada a estado: ${data.nuevoEstado} por técnico ${data.tecnico}`;
                    emailData.to = `cliente@alfared.com`;
                    break;
                    
                case 'pago_procesado':
                    subject = `Pago Procesado - ${data.transactionId}`;
                    message = `[EMAIL] Pago #${data.transactionId} por ${data.monto} procesado exitosamente`;
                    emailData.to = `cliente@alfared.com`;
                    break;
                    
                default:
                    subject = `Notificación - ${event}`;
                    message = `[EMAIL] Evento ${event} procesado`;
                    emailData.to = 'system@alfared.com';
            }

            emailData.subject = subject;
            emailData.message = message;
            this.sentEmails.push(emailData);
            
            return message;

        } catch (error) {
            emailData.status = 'failed';
            emailData.error = error.message;
            this.sentEmails.push(emailData);
            throw error;
        }
    }

    // GET: Obtener emails enviados
    getSentEmails(limit = 20) {
        return {
            success: true,
            data: this.sentEmails.slice(-limit).reverse()
        };
    }

    // GET: Estadísticas de emails
    getEmailStats() {
        const total = this.sentEmails.length;
        const successful = this.sentEmails.filter(e => e.status === 'sent').length;
        const failed = this.sentEmails.filter(e => e.status === 'failed').length;

        return {
            success: true,
            data: {
                totalEmails: total,
                successfulEmails: successful,
                failedEmails: failed,
                successRate: total > 0 ? Math.round((successful / total) * 100) : 0
            }
        };
    }
}

class WebNotificationObserver {
    constructor(name, config = {}) {
        this.name = name || 'WebNotifications';
        this.config = {
            maxNotifications: 100,
            autoExpire: true,
            expireTime: 30000, // 30 segundos
            ...config
        };
        this.notifications = [];
        this.activeNotifications = [];
    }

    update(event, data) {
        const notification = {
            id: Date.now(),
            event,
            timestamp: new Date().toISOString(),
            status: 'active',
            expireAt: new Date(Date.now() + this.config.expireTime).toISOString()
        };

        try {
            let message = '';
            let type = 'info';
            let priority = 'normal';

            switch (event) {
                case 'nueva_factura':
                    message = `[WEB] Nueva factura generada: ${data.monto} para cliente ${data.clienteId}`;
                    type = 'success';
                    priority = 'high';
                    notification.actionUrl = `/facturas/${data.id}`;
                    break;
                    
                case 'orden_actualizada':
                    message = `[WEB] Orden #${data.ordenId} actualizada: ${data.nuevoEstado}`;
                    type = 'info';
                    priority = 'normal';
                    notification.actionUrl = `/ordenes/${data.ordenId}`;
                    break;
                    
                case 'pago_procesado':
                    message = `[WEB] Pago procesado exitosamente: ${data.monto}`;
                    type = 'success';
                    priority = 'high';
                    notification.actionUrl = `/pagos/${data.transactionId}`;
                    break;
                    
                default:
                    message = `[WEB] Evento ${event} procesado`;
                    type = 'info';
                    priority = 'low';
            }

            notification.message = message;
            notification.type = type;
            notification.priority = priority;
            
            this.notifications.push(notification);
            this.activeNotifications.push(notification);
            
            // Auto-limpiar notificaciones antiguas
            this.cleanupExpiredNotifications();
            
            // Limitar número máximo de notificaciones
            if (this.notifications.length > this.config.maxNotifications) {
                this.notifications = this.notifications.slice(-this.config.maxNotifications);
            }
            
            return message;

        } catch (error) {
            notification.status = 'failed';
            notification.error = error.message;
            this.notifications.push(notification);
            throw error;
        }
    }

    cleanupExpiredNotifications() {
        const now = new Date();
        this.activeNotifications = this.activeNotifications.filter(notification => {
            return new Date(notification.expireAt) > now;
        });
    }

    // GET: Obtener notificaciones activas
    getActiveNotifications() {
        this.cleanupExpiredNotifications();
        return {
            success: true,
            data: this.activeNotifications.sort((a, b) => {
                // Ordenar por prioridad y luego por fecha
                const priorityOrder = { high: 3, normal: 2, low: 1 };
                const aPriority = priorityOrder[a.priority] || 1;
                const bPriority = priorityOrder[b.priority] || 1;
                
                if (aPriority !== bPriority) {
                    return bPriority - aPriority;
                }
                
                return new Date(b.timestamp) - new Date(a.timestamp);
            })
        };
    }

    // POST: Marcar notificación como leída
    markAsRead(notificationId) {
        const notification = this.activeNotifications.find(n => n.id === notificationId);
        if (!notification) {
            return {
                success: false,
                error: 'Notificación no encontrada'
            };
        }

        notification.status = 'read';
        notification.readAt = new Date().toISOString();
        
        return {
            success: true,
            data: notification,
            message: 'Notificación marcada como leída'
        };
    }

    // DELETE: Limpiar todas las notificaciones
    clearAllNotifications() {
        const clearedCount = this.activeNotifications.length;
        this.activeNotifications = [];
        
        return {
            success: true,
            data: { clearedCount },
            message: `${clearedCount} notificaciones eliminadas`
        };
    }

    // GET: Estadísticas de notificaciones
    getNotificationStats() {
        const total = this.notifications.length;
        const active = this.activeNotifications.length;
        const byType = this.notifications.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
        }, {});

        return {
            success: true,
            data: {
                totalNotifications: total,
                activeNotifications: active,
                notificationsByType: byType,
                averagePerDay: this.calculateAveragePerDay()
            }
        };
    }

    calculateAveragePerDay() {
        if (this.notifications.length === 0) return 0;
        
        const firstNotification = new Date(this.notifications[0].timestamp);
        const lastNotification = new Date(this.notifications[this.notifications.length - 1].timestamp);
        const daysDiff = Math.max(1, (lastNotification - firstNotification) / (1000 * 60 * 60 * 24));
        
        return Math.round((this.notifications.length / daysDiff) * 100) / 100;
    }
}

class SMSNotificationObserver {
    constructor(name, config = {}) {
        this.name = name || 'SMSService';
        this.config = {
            maxLength: 160,
            retryAttempts: 2,
            ...config
        };
        this.sentSMS = [];
    }

    update(event, data) {
        const smsData = {
            id: Date.now(),
            event,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        try {
            let message = '';
            let phoneNumber = '+1234567890'; // Número por defecto

            switch (event) {
                case 'nueva_factura':
                    message = `AlfaRed: Nueva factura #${data.id} por ${data.monto}. Ver detalles en app.`;
                    break;
                    
                case 'orden_actualizada':
                    message = `AlfaRed: Orden #${data.ordenId} ${data.nuevoEstado}. Técnico: ${data.tecnico}`;
                    break;
                    
                case 'pago_procesado':
                    message = `AlfaRed: Pago ${data.monto} procesado. ID: ${data.transactionId}`;
                    break;
                    
                default:
                    message = `AlfaRed: ${event} procesado exitosamente`;
            }

            // Truncar mensaje si es muy largo
            if (message.length > this.config.maxLength) {
                message = message.substring(0, this.config.maxLength - 3) + '...';
            }

            smsData.message = message;
            smsData.phoneNumber = phoneNumber;
            smsData.length = message.length;
            
            this.sentSMS.push(smsData);
            
            return `[SMS] ${message}`;

        } catch (error) {
            smsData.status = 'failed';
            smsData.error = error.message;
            this.sentSMS.push(smsData);
            throw error;
        }
    }

    // GET: Obtener SMS enviados
    getSentSMS(limit = 20) {
        return {
            success: true,
            data: this.sentSMS.slice(-limit).reverse()
        };
    }

    // GET: Estadísticas de SMS
    getSMSStats() {
        const total = this.sentSMS.length;
        const successful = this.sentSMS.filter(sms => sms.status === 'sent').length;
        const failed = this.sentSMS.filter(sms => sms.status === 'failed').length;
        const avgLength = total > 0 ? 
            Math.round(this.sentSMS.reduce((sum, sms) => sum + (sms.length || 0), 0) / total) : 0;

        return {
            success: true,
            data: {
                totalSMS: total,
                successfulSMS: successful,
                failedSMS: failed,
                successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
                averageLength: avgLength
            }
        };
    }
}

// Clase adicional para notificaciones push móviles
class PushNotificationObserver {
    constructor(name, config = {}) {
        this.name = name || 'PushNotifications';
        this.config = {
            maxRetries: 3,
            deviceTokens: [],
            ...config
        };
        this.sentPush = [];
    }

    update(event, data) {
        const pushData = {
            id: Date.now(),
            event,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        try {
            let title = '';
            let body = '';
            let icon = 'default';

            switch (event) {
                case 'nueva_factura':
                    title = 'Nueva Factura';
                    body = `Factura #${data.id} por $${data.monto} generada`;
                    icon = 'invoice';
                    break;
                    
                case 'orden_actualizada':
                    title = 'Orden Actualizada';
                    body = `Orden #${data.ordenId} está ${data.nuevoEstado}`;
                    icon = 'service';
                    break;
                    
                case 'pago_procesado':
                    title = 'Pago Procesado';
                    body = `Pago de $${data.monto} procesado exitosamente`;
                    icon = 'payment';
                    break;
                    
                default:
                    title = 'AlfaRed Notificación';
                    body = `Evento ${event} procesado`;
                    icon = 'notification';
            }

            pushData.title = title;
            pushData.body = body;
            pushData.icon = icon;
            
            this.sentPush.push(pushData);
            
            return `[PUSH] ${title}: ${body}`;

        } catch (error) {
            pushData.status = 'failed';
            pushData.error = error.message;
            this.sentPush.push(pushData);
            throw error;
        }
    }

    // GET: Obtener notificaciones push enviadas
    getSentPushNotifications(limit = 20) {
        return {
            success: true,
            data: this.sentPush.slice(-limit).reverse()
        };
    }
}

// Instancia global del centro de notificaciones
const globalNotificationCenter = new NotificationCenter();

// Exportar para uso en diferentes entornos
if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = {
        NotificationCenter,
        EmailNotificationObserver,
        WebNotificationObserver,
        SMSNotificationObserver,
        PushNotificationObserver,
        globalNotificationCenter
    };
} else if (typeof window !== 'undefined') {
    // Navegador
    window.NotificationCenter = NotificationCenter;
    window.globalNotificationCenter = globalNotificationCenter;
    window.EmailNotificationObserver = EmailNotificationObserver;
    window.WebNotificationObserver = WebNotificationObserver;
    window.SMSNotificationObserver = SMSNotificationObserver;
    window.PushNotificationObserver = PushNotificationObserver;
}