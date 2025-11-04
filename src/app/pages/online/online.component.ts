import { Component, OnInit, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Geolocation } from '@capacitor/geolocation';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService, ResponderAuthUser } from '../../services/auth.service';

@Component({
  selector: 'app-online',
  templateUrl: './online.component.html',
  styleUrls: ['./online.component.scss'],
  standalone: false,
})
export class OnlineComponent implements OnInit, OnDestroy {
  online = false;
  reconnecting = false;
  loading = false;
  message = '';
  socket!: Socket;
  responderId: string | null = null;
  responderName: string | null = null;
  location = { lat: 0, lng: 0 };

  showIncidentPopup = false;
  incomingIncidents: any[] = [];
  currentIncidentIndex = 0;

  constructor(private router: Router, private auth: AuthService) {}

  async ngOnInit() {
    const wasOnline = localStorage.getItem('responder_online') === 'true';
    const currentResponder: ResponderAuthUser | null = this.auth.getResponder();

    if (currentResponder) {
      this.responderId = currentResponder.responderId;
      this.responderName =
        currentResponder.full_name || currentResponder.username || 'Responder';
    }

    if (wasOnline && this.responderId) {
      console.log('🔄 Restoring previous online session...');
      this.reconnecting = true;
      await this.goOnline(true);
    }
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }

  async toggleOnline() {
    this.loading = true;
    try {
      const currentResponder: ResponderAuthUser | null = this.auth.getResponder();
      if (!currentResponder) {
        this.message = 'Please log in first.';
        this.loading = false;
        return;
      }

      this.responderId = currentResponder.responderId;
      this.responderName =
        currentResponder.full_name || currentResponder.username || 'Responder';

      if (!this.responderId) {
        this.message = 'Missing responder ID in profile.';
        this.loading = false;
        return;
      }

      if (!this.online) {
        await this.goOnline();
      } else {
        this.goOffline();
      }
    } catch (err) {
      console.error(err);
      this.message = 'Error toggling online status.';
    } finally {
      this.loading = false;
    }
  }

  /** ✅ Ensures location permissions before calling Geolocation */
  private async ensureLocationPermission(): Promise<boolean> {
    try {
      console.log('[OnlineComponent] Checking location permission...');
      const permStatus = await Geolocation.checkPermissions();
      console.log('[OnlineComponent] Current permission:', permStatus);

      if (permStatus.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        console.log('[OnlineComponent] Request result:', request);

        if (request.location !== 'granted') {
          this.message = 'Location permission not granted. Please enable GPS.';
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('[OnlineComponent] Permission error:', err);
      this.message = 'Error checking location permission.';
      return false;
    }
  }

  async goOnline(autoReconnect = false) {
    try {
      // ✅ Request location permission first
      const granted = await this.ensureLocationPermission();
      if (!granted) {
        console.warn('[OnlineComponent] Location permission denied.');
        this.message = 'Unable to fetch GPS location. Please grant location access.';
        return;
      }

      // ✅ Now safe to get position
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      this.socket = io(environment.api_url, {
        transports: ['websocket'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        if (autoReconnect && this.reconnecting) {
          this.message = '🟡 Reconnected to server';
          setTimeout(() => (this.reconnecting = false), 1500);
        }
      });

      this.socket.on('disconnect', () => {
        console.warn('Socket disconnected');
        if (this.online) {
          this.reconnecting = true;
          this.message = 'Reconnecting to server...';
        }
      });

      this.socket.on('reconnect_attempt', (attempt) => {
        console.log(`Reconnection attempt ${attempt}`);
        this.reconnecting = true;
        this.message = 'Reconnecting to server...';
      });

      this.socket.onAny((event, data) => {
        console.log('[SOCKET EVENT RECEIVED]', event, data);
      });

      // Register this responder
      this.socket.emit('registerResponder', {
        responderId: this.responderId,
        name: this.responderName,
        lat: this.location.lat,
        lng: this.location.lng,
      });

      this.socket.on('registeredResponder', () => {
        this.online = true;
        this.reconnecting = false;
        this.message = '🟢 You are now online and ready for incidents.';
        localStorage.setItem('responder_online', 'true');
        console.log('[socket] registeredResponder confirmed');
      });

      // Incoming incidents
      this.socket.on('incidentNew', (incident) => {
        console.log('New Incident received:', incident);
        if (this.online) {
          const exists = this.incomingIncidents.find(
            (i) => i.incidentId === incident.incidentId || i._id === incident._id
          );
          if (!exists) {
            this.incomingIncidents.push({
              ...incident,
              responderCount: incident.responders?.length || 0,
              maxResponders: incident.maxResponders || 1,
            });
            this.showIncidentPopup = true;
          }
        }
      });

      this.socket.on('incidentAccepted', (data) => {
        console.log(`You accepted incident ${data.incidentId}`);
        this.removeIncidentFromQueue(data.incidentId);
        this.router.navigate(['/incident', data.incidentId]);
      });

      this.socket.on('incidentUpdated', (data) => {
        const inc = this.incomingIncidents.find((i) => i.incidentId === data.incidentId);
        if (inc) {
          inc.responderCount = data.responderCount;
          inc.status = data.status;
        }
      });

      this.socket.on('incidentClaimed', (data) => {
        this.removeIncidentFromQueue(data.incidentId);
        alert('An incident has reached maximum responders.');
      });

      this.startHeartbeat();
    } catch (geoErr) {
      console.error('Location error', geoErr);
      this.message = 'Unable to fetch GPS location.';
      this.reconnecting = false;
    }
  }

  goOffline() {
    this.online = false;
    this.reconnecting = false;
    this.message = '⚫ You are now offline.';
    if (this.socket) this.socket.disconnect();
    this.incomingIncidents = [];
    this.showIncidentPopup = false;
    localStorage.setItem('responder_online', 'false');
  }

  async startHeartbeat() {
    const HEARTBEAT_INTERVAL = 10000;
    setInterval(async () => {
      if (!this.online || !this.socket) return;

      try {
        // ✅ Ensure permission before fetching new location
        const granted = await this.ensureLocationPermission();
        if (!granted) return;

        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        this.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        this.socket.emit('responderHeartbeat', {
          responderId: this.responderId,
          lat: this.location.lat,
          lng: this.location.lng,
        });
      } catch (err) {
        console.warn('Heartbeat update failed', err);
      }
    }, HEARTBEAT_INTERVAL);
  }

  nextIncident() {
    if (this.incomingIncidents.length > 1) {
      this.currentIncidentIndex =
        (this.currentIncidentIndex + 1) % this.incomingIncidents.length;
    }
  }

  previousIncident() {
    if (this.incomingIncidents.length > 1) {
      this.currentIncidentIndex =
        (this.currentIncidentIndex - 1 + this.incomingIncidents.length) %
        this.incomingIncidents.length;
    }
  }

  removeIncidentFromQueue(incidentId: string) {
    this.incomingIncidents = this.incomingIncidents.filter(
      (i) => i.incidentId !== incidentId && i._id !== incidentId
    );
    if (this.incomingIncidents.length === 0) {
      this.showIncidentPopup = false;
    } else {
      this.currentIncidentIndex = Math.min(
        this.currentIncidentIndex,
        this.incomingIncidents.length - 1
      );
    }
  }

  acceptIncident() {
    const current = this.incomingIncidents[this.currentIncidentIndex];
    if (!current || !this.responderId) return;

    if (
      current.responderCount >= current.maxResponders ||
      current.status === 'claimed'
    ) {
      alert('All responder slots are filled.');
      this.removeIncidentFromQueue(current.incidentId || current._id);
      return;
    }

    this.socket.emit('acceptIncident', {
      incidentId: current.incidentId || current._id,
      responderId: this.responderId,
    });
  }

  declineIncident() {
    const current = this.incomingIncidents[this.currentIncidentIndex];
    if (current) {
      this.removeIncidentFromQueue(current.incidentId || current._id);
    }
  }

  openInMaps(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_system');
  }

  openPhoto(photoUrl: string) {
    window.open(photoUrl, '_system');
  }
}
