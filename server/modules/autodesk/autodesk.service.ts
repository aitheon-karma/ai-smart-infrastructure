import { Container, Service, Inject } from 'typedi';
import { MailerService, SendMailOptions } from '../core/mailer.service';
import { Transporter, TransporterService, Action, Event, param } from '@aitheon/transporter';
import  * as request from 'request-promise-native';
import { environment } from '../../environment';
import { Infrastructure } from '../infrastructures/infrastructure.model';
import { InfrastructureSchema } from '../infrastructures/infrastructure.model';

@Service()
@Transporter()
export class AutoDeskService extends TransporterService {

  mailerService: MailerService;

  private readonly AUTODESK_AUTH_URL = `${environment.autoDesk.baseUrl}/authentication/v1/authenticate`;

  constructor() {
    super(Container.get('TransporterBroker'));
    this.mailerService = Container.get(MailerService);
  }

  async getToken(): Promise<{ access_token: string, token_type: string, expires_in: number}> {
    const scope = 'bucket:create%20bucket:read%20data:write%20data:read%20viewables:read';
    const tokenBody = `client_id=${environment.autoDesk.clientId}&client_secret=${environment.autoDesk.clientSecret}&grant_type=client_credentials&scope=${scope}`;
    const token =  await request.post(this.AUTODESK_AUTH_URL, {headers: {
      'Content-type': 'application/x-www-form-urlencoded'
    }, body: tokenBody}) ;
    return JSON.parse(token);
  }

   async checkAndCreateBucket(): Promise<boolean> {
    const bucketCheckUrl = `${environment.autoDesk.baseUrl}/oss/v2/buckets/${environment.autoDesk.bucketName}/details`;
    const token = await this.getToken();
    let createBucket = false;

    try {
     await request.get(bucketCheckUrl, {headers: {
        'Authorization': `${token.token_type} ${token.access_token}`
      }});
    } catch (err) {
      createBucket = true;
    }

    if (createBucket) {
      try {
        const  autodeskCreateUrl = `${environment.autoDesk.baseUrl}/oss/v2/buckets`;
        await request.post(autodeskCreateUrl, {
          headers: {'Authorization': `${token.token_type} ${token.access_token}`, 'Content-type': 'application/json'},
          body:   JSON.stringify({
            bucketKey: environment.autoDesk.bucketName,
            policyKey: 'transient'
          })
        });
      }
      catch (err) {
        return false;
      }
    }
    return true;
  }



  async uploadAndConvert(signedUrl: string, fileName: string, infrastructure: Infrastructure) {
    // get the file from our drive;

    // tslint:disable-next-line: no-null-keyword
    const file = await request.get(signedUrl, {encoding: null});

   // upload to autodesk servers
   const uploadUrl = `${environment.autoDesk.baseUrl}/oss/v2/buckets/${environment.autoDesk.bucketName}/objects/${fileName}`;
   const token = await this.getToken();
// tslint:disable-next-line: no-null-keyword
   const uploadResult = JSON.parse(await request.put(uploadUrl, { body: file , encoding: null,
     headers: {'Authorization': `${token.token_type} ${token.access_token}`, 'Content-type': 'application/octet-stream'}}));

   // Now start the conversion
    const convertUrl = `${environment.autoDesk.baseUrl}/modelderivative/v2/designdata/job`;
    const convertFileData = this._buildConvertFileData(uploadResult.objectId);

    const convertFileResult = JSON.parse(await request.post(convertUrl,
       { headers: { 'Authorization': `${token.token_type} ${token.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(convertFileData)} ));


    // Update the wiget with the urn from autodesk servers
    // infrastructure.layout.urn = uploadResult.objectId;
    await InfrastructureSchema.updateOne({_id: infrastructure._id}, infrastructure);

    return convertFileResult;

  }


  async getByUrn(urn: string) {

    const verifyUrl =
      `${environment.autoDesk.baseUrl}/modelderivative/v2/designdata/` + `${(Buffer.from(urn)).toString('base64')}/manifest`;
    const token = await this.getToken();
    const result = await request.get(verifyUrl, {headers: { 'Authorization': `${token.token_type} ${token.access_token}` }});

    return {
      tokenInfo: token,
      autoDeskInfo: JSON.parse(result)
    };
  }


  private _buildConvertFileData(urn: string) {
    urn = (Buffer.from(urn)).toString('base64');
    return  {
      input: {
        urn: urn
      },
      output: {
        formats: [
          {
            type: 'svf',
            views: [
              '2d',
              '3d'
            ]
          }
        ]
      }
    };
  }



}
