import { Component, OnInit } from '@angular/core';
import { AuthService } from '@aitheon/core-client';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { WebSocketService } from './shared/web-socket.service';

@Component({
  selector: 'ai-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  serviceName = 'Smart Infrastructure';
  googleMapScript: HTMLScriptElement;
  currentOrg: any;
  activeTab: string;

  constructor(
    public authService: AuthService,
    public toastr: ToastrService,
    public webSocketService: WebSocketService,
    public router: Router
  ) {
    this.googleMapScript = document.createElement('script');
    this.googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapKey}`;
    document.head.appendChild(this.googleMapScript);
    this.webSocketService.init();
  }

  ngOnInit() {
    this.authService.loggedIn.subscribe((loggedIn: boolean) => {
      console.log('loggedIn ', loggedIn);
    });
    this.authService.activeOrganization.subscribe(org => {
      this.currentOrg = org;
      if (localStorage.getItem('orgId') && (JSON.parse(localStorage.getItem('orgId')) !== org._id)) {
        localStorage.removeItem('googleMapMarkers');
        localStorage.setItem('orgId', JSON.stringify(org._id));
        this.reload('/dashboard');
      } else {
        localStorage.setItem('orgId', JSON.stringify(org._id));
      }
    });
  }

  async reload(url: string): Promise<boolean> {
    await this.router.navigateByUrl('/infrastructure/', { skipLocationChange: true });
    return this.router.navigateByUrl(url);
  }

  changeTab(event: Event, tab: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeTab = tab;
  }
}
