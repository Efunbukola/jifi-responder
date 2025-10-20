import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { io, Socket } from 'socket.io-client';
import { GoogleMap } from '@angular/google-maps';

@Component({
  selector: 'app-incident-detail',
  templateUrl: './incident-detail.component.html',
  styleUrls: ['./incident-detail.component.scss'],
  standalone: false,
})
export class IncidentDetailComponent implements OnInit, OnDestroy {
  @ViewChild(GoogleMap) map!: GoogleMap;

  socket!: Socket;
  incident: any = null;
  loading = true;
  error = '';
  mapsUrl = '';
  currentLocation: { lat: number; lng: number } | null = null;
  intervalId: any;

  // 🗺️ Map Config
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 };
  zoom = 16;
  markers: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Invalid incident ID';
      return;
    }

    try {
      await this.fetchCurrentLocation();
      await this.loadIncident(id);
      this.initializeMap();
      this.startHeartbeat();
    } catch (err) {
      console.error('Error initializing incident detail:', err);
      this.error = 'Unable to load incident details.';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async fetchCurrentLocation() {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    this.currentLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async loadIncident(id: string) {
    const res: any = await this.http
      .get(`${environment.api_url}api/incidents/${id}`)
      .toPromise();

    this.incident = res;

    const [lng, lat] = this.incident.location.coordinates;
    this.mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  }

  initializeMap() {
    if (!this.incident) return;
    const [lng, lat] = this.incident.location.coordinates;
    this.center = { lat, lng };

    this.markers = [
      {
        position: { lat, lng },
        label: { text: '📍 Incident', className: 'font-bold text-red-700' },
      },
    ];
  }

  startHeartbeat() {
    this.socket = io(environment.api_url, {
      transports: ['websocket'],
      reconnection: true,
    });

    this.intervalId = setInterval(async () => {
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        this.currentLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        this.socket.emit('responderHeartbeat', {
          responderId: '380ddd95-1bcb-43c2-8547-c74ea7850174',
          lat: this.currentLocation.lat,
          lng: this.currentLocation.lng,
        });
      } catch (err) {
        console.warn('Heartbeat update failed:', err);
      }
    }, 10000);
  }

  openMaps() {
    if (this.mapsUrl) {
      window.open(this.mapsUrl, '_system');
    }
  }

  openPhoto(photoUrl: string) {
    window.open(photoUrl, '_blank');
  }
}
