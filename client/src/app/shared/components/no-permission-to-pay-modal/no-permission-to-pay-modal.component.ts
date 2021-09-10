import { Component, OnInit, Input, Output, OnChanges, SimpleChanges, TemplateRef, ViewChild, EventEmitter } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

export enum PtpType {
  INFRASTRUCTURE = 'INFRASTRUCTURE'
}

@Component({
  selector: 'ai-no-permission-to-pay-modal',
  templateUrl: './no-permission-to-pay-modal.component.html',
  styleUrls: ['./no-permission-to-pay-modal.component.scss']
})

export class NoPermissionToPayModalComponent implements OnInit, OnChanges {
  @Input() status: string;
  @Input() ptpType: string;
  @Output() ptpModalClose: EventEmitter<boolean> = new EventEmitter<boolean>();
  @ViewChild('ptpModal') ptpModal: TemplateRef<any>;

  constructor(private modalService: BsModalService,) { }

  pTpModalRef: BsModalRef;

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.status === 'ENABLED') {
      this.pTpModalRef = this.modalService.show(this.ptpModal, { backdrop: 'static' });
    }
  }

  closePtpModal() {
    this.pTpModalRef.hide();
    this.ptpModalClose.emit(true);
  }

}
