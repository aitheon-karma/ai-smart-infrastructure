import { Service, Inject, Container } from 'typedi';
import { RestService } from '../../core/rest.service';
import { Current, Organization } from '@aitheon/core-server';
import { InfrastructureLocation } from '../../infrastructures/infrastructure.model';


@Service()
export class UsersService {

  @Inject()
  restService: RestService;

  constructor() {}

  async update(body: any, current: Current, uri: string): Promise<any> {
    return this.restService.put({
      uri,
      token: current.token,
      body,
      organization: current.organization._id
    });
  }

  async get(current: Current, uri: string): Promise<any> {
    return this.restService.get({
      uri,
      token: current.token,
      organization: current.organization._id
    });
  }

  async getOrgById(current: Current) {
    const uri = `${this.getUsersBaseUrl()}/api/organizations/${current.organization._id}`;
    return this.get(current, uri);
  }

  async addLocationToOrg(location: InfrastructureLocation, current: Current, type: string): Promise<string> {
    const body = { location: { ...location, type } };
    const uri = `${this.getUsersBaseUrl()}/api/organizations/${current.organization._id}/locations`;
    const organization = await this.update(body, current, uri);
    const newLocation = organization.locations.pop();
    return newLocation._id;
  }

  async updateLocation(location: InfrastructureLocation, current: Current): Promise<string> {
    const uri = `${this.getUsersBaseUrl()}/api/organization/updateLocation`;
    const organization = await this.update(location, current, uri);
    return organization;
  }

  async getOrgDomain(organizationId: string): Promise<string> {
    const uri = `${this.getUsersBaseUrl()}/api/organization/${organizationId}/search/domain`;
    const domain = await this.restService.get({ uri });
    return domain;
  }

  private getUsersBaseUrl() {
    return '/users';
  }
}
