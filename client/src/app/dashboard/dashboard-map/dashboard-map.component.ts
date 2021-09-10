import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { GoogleMap, MapInfoWindow, MapMarker } from '@angular/google-maps'
import { AuthService } from '@aitheon/core-client';
import { DashboardService } from '../dashboard.service';
import { debounceTime } from 'rxjs/operators';
import { Router } from "@angular/router";

@Component({
    selector: 'ai-dashboard-map',
    templateUrl: './dashboard-map.component.html',
    styleUrls: ['./dashboard-map.component.scss']
})
export class DashboardMapComponent implements OnInit {
    @ViewChild(GoogleMap, { static: false }) map: GoogleMap
    @ViewChild(MapInfoWindow, { static: false }) info: MapInfoWindow
    @Input() googleMapMarkers: any;
    @Input() infrastructuresType: string;
    @ViewChildren('markerElem') markerElem!: QueryList<any>;
    mapTypeId: string = 'roadmap';

    currentOrg: any;
    zoom = 7;
    center = { lat: 44.63, lng: 28.77 };
    options: google.maps.MapOptions = {
        zoomControl: false,
        scrollwheel: true,
        disableDoubleClickZoom: true,
        maxZoom: 18,
        minZoom: 3,
        mapTypeId: this.mapTypeId,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        backgroundColor: '#2b2b2b',
        styles: [
            {
                "featureType": "all",
                "elementType": "labels.text.fill",
                "stylers": [
                    {
                        "saturation": 36
                    },
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 40
                    }
                ]
            },
            {
                "featureType": "all",
                "elementType": "labels.text.stroke",
                "stylers": [
                    {
                        "visibility": "on"
                    },
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 16
                    }
                ]
            },
            {
                "featureType": "all",
                "elementType": "labels.icon",
                "stylers": [
                    {
                        "visibility": "off"
                    }
                ]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry.fill",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 20
                    }
                ]
            },
            {
                "featureType": "administrative",
                "elementType": "geometry.stroke",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 17
                    },
                    {
                        "weight": 1.2
                    }
                ]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 20
                    }
                ]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 21
                    }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.fill",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 17
                    }
                ]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 29
                    },
                    {
                        "weight": 0.2
                    }
                ]
            },
            {
                "featureType": "road.arterial",
                "elementType": "geometry",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 18
                    }
                ]
            },
            {
                "featureType": "road.local",
                "elementType": "geometry",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 16
                    }
                ]
            },
            {
                "featureType": "transit",
                "elementType": "geometry",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 19
                    }
                ]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [
                    {
                        "color": "#000000"
                    },
                    {
                        "lightness": 17
                    }
                ]
            }
          ]
    };
    markers = [{
        position: {
            lat: 34.052235,
            lng: -118.243683,
        },
        label: {
            color: 'white',
            text: 'Dodger Stadium, LA',
        }
    }];
  markerContent: any;
  prev: any;
  receivedGoogleMapMarkers: any;
  infoClicked = false;
  selectedMarkerId = '';
  loading: boolean;

  constructor(private authService: AuthService,
              private dashboardService: DashboardService,
              private router: Router) { }

  ngOnInit() {
    this.loading = true;
    this.authService.activeOrganization.subscribe(org => {
      this.currentOrg = org;
    });

    this.dashboardService.viewMarkersCoordsReceived.pipe(
      debounceTime(99)
    ).subscribe(coordsReceived => {
      this.receivedGoogleMapMarkers = localStorage.getItem('googleMapMarkers') ?
        JSON.parse(localStorage.getItem('googleMapMarkers')) :
        this.googleMapMarkers;

      if (!this.receivedGoogleMapMarkers.length) {
        this.loading = false;
        return;
      }

      let dynamicCenter = this.getMarkersCenter();
      if (dynamicCenter.lat && dynamicCenter.lng) {
        this.center = dynamicCenter;
      }
      setTimeout(() => {
        this.setMarkerBounce();
      }, 199);
    });
  }

  openInfo(marker: MapMarker, content) {
    this.selectedMarkerId = content._id;
    this.markerContent = {...content.data};
    this.info.open(marker);
    this.infoClicked = true;
    this.dashboardService.markerSelected(content.data);
  }

  openHoverInfo(marker: MapMarker, content) {
    if (this.info && !this.infoClicked) {
      this.markerContent = {...content.data};
      this.info.open(marker);
    }
  }

  click($event: google.maps.MouseEvent | google.maps.IconMouseEvent) {
    if (this.info && this.infoClicked) {
      this.info.close();
      this.infoClicked = false;
      this.dashboardService.markerSelected({});
    }
  }

  hoverOut() {
    if (this.info && !this.infoClicked) {
      this.info.close();
      this.infoClicked = false;
    }
  }

  setMarkerBounce() {
    const markerBounds = this.map.getBounds();
    this.markerElem.forEach(marker => {
      markerBounds.extend(marker.getPosition())
    });
    this.map.fitBounds(markerBounds, 30);
    this.zoom = this.map.getZoom();
    this.loading = false;
  }

  getMarkersCenter() {
    const latArr = [];
    const lngArr = [];

    this.receivedGoogleMapMarkers.map(marker => {
      latArr.push(marker.position.lat);
      lngArr.push(marker.position.lng);
    });
    return {
      lat: (Math.min(...latArr) + Math.max(...latArr)) / 2,
      lng: (Math.min(...lngArr) + Math.max(...lngArr)) / 2
    };
  }

  openInfrastructure(markerData: any){
    let data = {
      Id : markerData._id,
      name : markerData.name
    }
    localStorage.setItem('infrastructure', JSON.stringify(data));
    this.router.navigate(['/infrastructure/' + markerData._id + '/dashboard']);
  }

  zoomIn() {
    if (this.zoom <= this.options.maxZoom) this.zoom++
  }

  zoomOut() {
    if (this.zoom >= this.options.minZoom) this.zoom--
  }

  switchView() {
    if (this.mapTypeId === 'roadmap') {
      this.mapTypeId = 'satellite';
    } else {
      this.mapTypeId = 'roadmap';
    }
    this.options = {
      ...this.options,
      mapTypeId: this.mapTypeId
    };
  }
}
