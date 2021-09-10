import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { TaskService } from '../../shared/task.service';

@Component({
  selector: 'ai-pick-pack-stations',
  templateUrl: './pick-pack-stations.component.html',
  styleUrls: ['./pick-pack-stations.component.scss']
})
export class PickPackStationsComponent implements OnInit {

  // pickStations = [{ station: 'ADDVERB', code: 'PTL01', state: 'Busy' }, { station: 'ADDVERB', code: 'PTL02', state: 'Available' }, { station: 'ADDVERB', code: 'PTL03' , state: 'Available' }, { station: 'ADDVERB', code: 'PTL04' , state: 'Busy' }, { station: 'AITHEON', code: 'AI01' , state: 'Available' }, { station: 'AITHEON', code: 'AI02' , state: 'Available' }, { station: 'AITHEON', code: 'AI03' , state: 'Available' }];
  constructor(private modalService: BsModalService , private taskService : TaskService) { }
  exampleModalRef: BsModalRef;
  selectedptlInfo: any ;
  isLoading: boolean = true;
  pickStations: any = [];
  modalConfig={
    class :'m-top'
  };
  @ViewChild('ptlModal') ptlModal: TemplateRef<any>;
  ngOnInit() {
    this.getPTL();
  }
  getPTL(){
    console.log('In PICk pack stations');
    // this.taskService.getPtlInfo().subscribe((response)=>{
    //   console.log('PTL response =>', response );
    //   this.pickStations = response;
    //   this.isLoading = false;
    // });
  }
  OpenSettingModal(ptlInfo) {
    this.selectedptlInfo = ptlInfo;
    console.log('ptl => ', this.selectedptlInfo);
    this.exampleModalRef = this.modalService.show(this.ptlModal,this.modalConfig);
  }
  onCloseDialog() {
    this.exampleModalRef.hide();
  }
}
