import { Component, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Geolocation } from '@capacitor/geolocation';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-online',
  templateUrl: './online.component.html',
  styleUrls: ['./online.component.scss'],
  standalone:false
})
export class OnlineComponent implements OnDestroy {
  online = false;
  loading = false;
  message = '';
  socket!: Socket;
  responderId: string | null = null;
  responderName: string | null = null;
  location = { lat: 0, lng: 0 };

  // Popup state
  showIncidentPopup = false;
  incomingIncident: any = null;

  constructor() {}

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }

  async toggleOnline() {
    this.loading = true;
    try {
      this.responderId = "380ddd95-1bcb-43c2-8547-c74ea7850174";
      this.responderName = "Ade"

      if (!this.responderId || !this.responderName) {
        this.message = 'Missing responder credentials. Please register first.';
        this.loading = false;
        return;
      }

      if (!this.online) {
        await this.goOnline();
      } else {
        await this.goOffline();
      }
    } catch (err) {
      console.error(err);
      this.message = 'Error toggling online status.';
    } finally {
      this.loading = false;
    }
  }

  async goOnline() {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      this.socket = io(environment.api_url, {
        transports: ['websocket'],
        reconnection: true
      });

      this.socket.emit('registerResponder', {
        responderId: this.responderId,
        name: this.responderName,
        lat: this.location.lat,
        lng: this.location.lng
      });

      this.socket.on('registeredResponder', () => {
        this.online = true;
        this.message = 'You are now online and ready for incident notifications.';
        console.log('[socket] registeredResponder confirmed');
      });

      // New incident
      this.socket.on('incidentNew', (incident) => {
        console.log('New Incident received:', incident);
        if (this.online) {
          this.incomingIncident = incident;
          this.showIncidentPopup = true;
        }
      });

      // Accepted confirmation
      this.socket.on('incidentAccepted', (data) => {
        alert(`You successfully accepted incident ${data.incidentId}`);
        this.showIncidentPopup = false;
      });

      // Another responder claimed
      this.socket.on('incidentClaimed', (data) => {
        if (this.incomingIncident && this.incomingIncident._id === data.incidentId) {
          this.showIncidentPopup = false;
          alert('This incident has already been claimed by another responder.');
        }
      });

      this.startHeartbeat();
    } catch (geoErr) {
      console.error('Location error', geoErr);
      this.message = 'Unable to fetch GPS location.';
    }
  }

  goOffline() {
    this.online = false;
    this.message = 'You are now offline.';
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  async startHeartbeat() {
    const HEARTBEAT_INTERVAL = 10000;
    setInterval(async () => {
      if (!this.online || !this.socket) return;

      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        this.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        this.socket.emit('responderHeartbeat', {
          responderId: this.responderId,
          lat: this.location.lat,
          lng: this.location.lng
        });
      } catch (err) {
        console.warn('Heartbeat location update failed', err);
      }
    }, HEARTBEAT_INTERVAL);
  }

  // Called when user taps "Accept"
  acceptIncident() {
    if (!this.incomingIncident) return;
    this.socket.emit('acceptIncident', {
      incidentId: this.incomingIncident._id,
      responderId: this.responderId
    });
  }

  // Called when user taps "Decline"
  declineIncident() {
    this.showIncidentPopup = false;
    this.incomingIncident = null;
  }

  // Called when user taps "View on Map"
  openInMaps(lat: number, lng: number) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_system'); // for mobile device
  }

  openPhoto(photoUrl: string) {
  window.open(photoUrl, '_system'); // opens Cloudinary or S3 photo link
  }

}
