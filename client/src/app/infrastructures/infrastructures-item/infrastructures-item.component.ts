import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DashboardService } from "../../dashboard/dashboard.service";
import { InfrastructureTasksRestService } from '@aitheon/smart-infrastructure';

@Component({
  selector: 'ai-infrastructures-item',
  templateUrl: './infrastructures-item.component.html',
  styleUrls: ['./infrastructures-item.component.scss']
})
export class InfrastructuresItemComponent implements OnInit {

  constructor(private router: Router,
              private infrastructureService: InfrastructureTasksRestService,
              private toastr: ToastrService,
              private dashboardService: DashboardService) { }

  @Input() infrastructure: any;
  actionDropdown: boolean = false;
  @Output('onDelete') onDelete: EventEmitter<any> = new EventEmitter<any>();
  @Output() getInfraItem: EventEmitter<any> = new EventEmitter<any>();
  loading: boolean = false;
  @ViewChild('infraItem') infraItem: ElementRef;
  isInfraSelectedFromMAp = false;

  ngOnInit() {
    this.dashboardService.viewMarkerSelected.subscribe(infraData => {
      this.isInfraSelectedFromMAp = this.infrastructure._id === infraData._id;
      if (this.isInfraSelectedFromMAp === true) {
        this.getInfraItem.emit({el: this.infraItem, data: this.infrastructure});
      }
    });
  }

  openInfrastructure(){
    let data = {
      Id : this.infrastructure._id,
      name : this.infrastructure.name
    }
    localStorage.setItem('infrastructure',JSON.stringify(data));
    this.router.navigate(['/infrastructure/'+this.infrastructure._id+'/dashboard']);
  }

  // without generic modal
  deleteInfrastructure(event: any) {
    // event.stopPropagation();
   //  event.preventDefault();
     this.loading= true;
     this.actionDropdown = false;
     this.infrastructureService.update(this.infrastructure._id, { status: 'DELETED' }).subscribe((res: any) => {
       this.loading= false;
       this.onDelete.emit(true);
       this.toastr.success('Infrastructure deleted');
     }, (err: any) => {
       this.toastr.success('Delete Failed');
      this.loading= false;
       this.onDelete.emit(false);
     })
   }

  editInfrastructure(event: any,infrastructureId:string) {
    event.stopPropagation();
    event.preventDefault();
    this.actionDropdown = false;
    // this.toastr.success('Edit'+ infrastructureId);
    this.router.navigateByUrl(`infrastructure/edit/${infrastructureId}`);
  }

  onActionClick(event: any) {
    event.stopPropagation();
    event.preventDefault();
    this.actionDropdown = !this.actionDropdown;
  }

  public hasAnyLogo(): boolean {
    return this.hasOwnLogo() || this.hasLocationLogo();
  }

  public getLogoUrl(): string {
    let imgUrl = '';

    if (this.hasOwnLogo()) {
      imgUrl = this.infrastructure.logo.signedUrl;
    } else {
      imgUrl = this.hasLocationLogo() ? this.infrastructure.location.logo.signedUrl : '';
    }

    return imgUrl;
  }

  public hasOwnLogo(): boolean {
    return this.infrastructure && this.infrastructure.logo;
  }

  public hasLocationLogo(): boolean {
    return this.infrastructure.location && this.infrastructure.location.logo;
  }
}
