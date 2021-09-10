import Container, { Service, Inject } from 'typedi';
import { Transporter, TransporterService } from '@aitheon/transporter';
import { Area, AreaSchema, IArea } from './area.model';


@Service()
@Transporter()
export class AreasService extends TransporterService {

  constructor() {
    super(Container.get('TransporterBroker'));
  }

  async listByQuery(body: any): Promise<Area[]> {
    const { infrastructure, floor, type } = body;
    const query = {} as any;
    if (infrastructure) {
      query.infrastructure = infrastructure;
    }
    if (floor) {
      query.floor = floor;
    }
    if (type) {
      query.type = type;
    }

    return AreaSchema.find(query);
  }


  async create(area: Area): Promise<IArea> {
    return AreaSchema.create(area);
  }

  async update(id: any, area: Area): Promise<Area> {
    return AreaSchema.findByIdAndUpdate(id, area, { new: true }).lean();
  }

  async findById(areaId: string): Promise<Area> {
    return AreaSchema.findById(areaId).lean();
  }

  async remove(areaId: string): Promise<Area> {
    return AreaSchema.findByIdAndRemove(areaId);
  }

  async removeByIds(areaIds: string[]): Promise<any> {
    return await AreaSchema.deleteMany({ _id: { $in: areaIds }});
  }

}
