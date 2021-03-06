import { Injectable } from '@angular/core';
import { RestService } from '@aitheon/core-client';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  constructor(
    private restService: RestService,
  ) {}

  public getUserById(userId: string): Observable<any> {
    return this.restService.fetch(environment.baseApi + environment.usersURI + `/api/users/${userId}`, null, true);
  }

  deleteDevice(id: string): Observable<any> {
    return this.restService.delete(environment.baseApi + environment.deviceManagerURI + `/api/devices/${id}`, true);
  }

  public uuidv4Generator() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable-next-line:no-bitwise triple-equals
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
