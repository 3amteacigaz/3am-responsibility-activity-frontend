// Push Notifications Service
import { notificationAPI } from './api';

class PushNotificationService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.registration = null;
    this.subscription = null;
  }

  // Check if push notifications are supported
  checkSupport() {
    // Check for HTTPS (required for push notifications)
    const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
    
    // Check for required APIs
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    console.log('🔔 Push notification support check:');
    console.log('  - HTTPS/localhost:', isHttps);
    console.log('  - Service Worker:', hasServiceWorker);
    console.log('  - Push Manager:', hasPushManager);
    console.log('  - Notification API:', hasNotification);
    
    const supported = isHttps && hasServiceWorker && hasPushManager && hasNotification;
    console.log('  - Overall supported:', supported);
    
    return supported;
  }

  // Check if push notifications are supported (method)
  isNotificationSupported() {
    return this.isSupported;
  }

  // Initialize push notifications
  async initialize() {
    if (!this.isNotificationSupported()) {
      console.warn('🔔 Push notifications not supported');
      console.warn('Requirements:');
      console.warn('  - HTTPS or localhost');
      console.warn('  - Modern browser with Service Worker support');
      console.warn('  - Push Manager API support');
      console.warn('  - Notification API support');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('🔔 Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return true;
    } catch (error) {
      console.error('🔔 Service Worker registration failed:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isNotificationSupported()) {
      return 'not-supported';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('🔔 Error requesting notification permission:', error);
      return 'denied';
    }
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.isNotificationSupported()) {
      return 'not-supported';
    }
    return Notification.permission;
  }

  // Subscribe to push notifications
  async subscribe() {
    if (!this.registration) {
      console.error('🔔 Service Worker not registered');
      return null;
    }

    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('🔔 Already subscribed to push notifications');
        return this.subscription;
      }

      // Create new subscription
      const vapidPublicKey = 'BC_xnlEBNqyjEt8KsnJu7OkDjBvop4S3ERUFpqpF9rfXeOdVHt0wq3_qa_DlY6iqlo-rKq4uCKS0MI-uIfOW9Z4'; // Must match backend
      
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('🔔 Subscribed to push notifications:', this.subscription);

      // Send subscription to backend
      await this.sendSubscriptionToBackend(this.subscription);

      return this.subscription;
    } catch (error) {
      console.error('🔔 Error subscribing to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.subscription) {
      console.log('🔔 Not subscribed to push notifications');
      return true;
    }

    try {
      await this.subscription.unsubscribe();
      
      // Remove subscription from backend
      await this.removeSubscriptionFromBackend();
      
      this.subscription = null;
      console.log('🔔 Unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('🔔 Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Send subscription to backend
  async sendSubscriptionToBackend(subscription) {
    try {
      await notificationAPI.savePushSubscription({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      console.log('🔔 Subscription sent to backend');
    } catch (error) {
      console.error('🔔 Error sending subscription to backend:', error);
    }
  }

  // Remove subscription from backend
  async removeSubscriptionFromBackend() {
    try {
      await notificationAPI.removePushSubscription();
      console.log('🔔 Subscription removed from backend');
    } catch (error) {
      console.error('🔔 Error removing subscription from backend:', error);
    }
  }

  // Show local notification (for testing)
  showLocalNotification(title, options = {}) {
    if (!this.isNotificationSupported() || Notification.permission !== 'granted') {
      console.warn('🔔 Cannot show notification - permission not granted');
      return;
    }

    const notification = new Notification(title, {
      body: options.body || 'Test notification',
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'local-notification',
      requireInteraction: options.requireInteraction || false,
      ...options
    });

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get subscription status
  async getSubscriptionStatus() {
    if (!this.registration) {
      return { subscribed: false, supported: this.isSupported };
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      return {
        subscribed: !!this.subscription,
        supported: this.isSupported,
        permission: this.getPermissionStatus(),
        subscription: this.subscription
      };
    } catch (error) {
      console.error('🔔 Error getting subscription status:', error);
      return { subscribed: false, supported: this.isNotificationSupported(), error: error.message };
    }
  }
}

// Create singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;