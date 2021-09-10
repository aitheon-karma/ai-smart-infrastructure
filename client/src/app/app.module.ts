import { NgModule } from '@angular/core';
import { CoreClientModule, Cookie } from '@aitheon/core-client';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { SmartInfrastructureModule, Configuration, ConfigurationParameters } from '@aitheon/smart-infrastructure';
import { TemplateModule as OrchestratorModule } from '@aitheon/orchestrator';
import { MarketplaceModule } from '@aitheon/marketplace';
import { ItemManagerModule } from '@aitheon/item-manager';
import { CreatorsStudioModule } from '@aitheon/creators-studio';
import { SystemGraphModule } from '@aitheon/system-graph';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AvatarModule } from 'ngx-avatar';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { ColorPickerModule } from 'ngx-color-picker';
import { DeviceManagerModule } from '@aitheon/device-manager';

const baseHost = Cookie.get('base_host') || 'dev.aitheon.com';
const url = environment.production ? `https://${baseHost}` : 'http://localhost:3000';
const options = environment.production ? { path: `/smart-infrastructure/socket.io` } : {};
const config: SocketIoConfig = { url, options };

export function apiConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: '.'
  };
  return new Configuration(params);
}

export function apiOrchestratorConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: `${environment.production ? '' : environment.baseApi}/orchestrator`
  };
  return new Configuration(params);
}

export function apiMarketplaceConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: `${environment.production ? '' : environment.baseApi}/marketplace`
  };
  return new Configuration(params);
}

export function apiItemManagerConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: `${environment.production ? '' : environment.baseApi}/item-manager`
  };
  return new Configuration(params);
}

export function apiCreatorsStudioConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: `${environment.production ? '' : environment.baseApi}/creators-studio`
  };
  return new Configuration(params);
}

export function apiSystemGraphConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: `${environment.production ? '' : environment.baseApi}/system-graph`
  };
  return new Configuration(params);
}

export function apiDeviceManagerConfigFactory(): Configuration {
  const params: ConfigurationParameters = {
    basePath: `${environment.production ? '' : environment.baseApi}/device-manager`
  };
  return new Configuration(params);
}

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    AppRoutingModule,
    SocketIoModule.forRoot(config),
    BrowserAnimationsModule,
    BrowserModule,
    CoreClientModule.forRoot({
      baseApi: environment.baseApi,
      production: environment.production,
      service:environment.service
    }),
    SmartInfrastructureModule.forRoot(apiConfigFactory),
    OrchestratorModule.forRoot(apiOrchestratorConfigFactory),
    MarketplaceModule.forRoot(apiMarketplaceConfigFactory),
    ItemManagerModule.forRoot(apiItemManagerConfigFactory),
    CreatorsStudioModule.forRoot(apiCreatorsStudioConfigFactory),
    SystemGraphModule.forRoot(apiSystemGraphConfigFactory),
    DeviceManagerModule.forRoot(apiDeviceManagerConfigFactory),
    AvatarModule.forRoot(),
    ColorPickerModule
  ],
  exports: [],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
