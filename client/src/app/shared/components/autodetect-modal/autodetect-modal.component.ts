import { Subscription } from 'rxjs';
import { ModalService } from '@aitheon/core-client';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Component, OnInit, ViewChild, TemplateRef, EventEmitter, Output, OnDestroy } from '@angular/core';
import { DetectedDevice } from './detected-device';
import { ToastrService } from 'ngx-toastr';
import { RunnerService } from '../../services/runner.service';

@Component({
  selector: 'ai-autodetect-modal',
  templateUrl: './autodetect-modal.component.html',
  styleUrls: ['./autodetect-modal.component.scss']
})
export class AutodetectModalComponent implements OnInit, OnDestroy {
  @ViewChild('autoDetectModal') autoDetectModal: TemplateRef<any>;
  @Output() addNewDevice: EventEmitter<DetectedDevice> = new EventEmitter<DetectedDevice>();
  @Output() modalClose: EventEmitter<any> = new EventEmitter<any>();

  modalType = 'AUTODETECT_MODAL';
  autoDetectModalRef: BsModalRef;
  firstStep: boolean = false;
  secondStep: boolean = false;
  thirdStep: boolean = false;
  errorStep: boolean = false;
  subscription: Subscription;
  controller: any;
  communicationType: string;
  detectedDevice: DetectedDevice;

  constructor(private bsModalService: BsModalService,
              private modalService: ModalService,
              private toastr: ToastrService,
              private runnerService: RunnerService) { }

  ngOnInit() {
    this.subscription = this.modalService.openModal$.subscribe(({ type, data } ) => {
      if (!data.form.controller) {
        this.toastr.error('You need to select controller for autodetect');
        return setTimeout(() => {
          this.closeModal();
        }, 1000);
      }
      this.runnerService.connectToWs(data.form.controller);
      this.controller = data.form.controller;
      this.communicationType = data.form.communicationType;
      this.show();
    });
  }

  show() {
    this.autoDetectModalRef = this.bsModalService.show(this.autoDetectModal,
      Object.assign({}, { class: 'custom-modal custom-modal--medium' })
    );
    this.firstStep = true;
  }

  closeModal(event?: Event, cancelLoading: boolean = true) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    this.modalClose.emit(cancelLoading);
    this.autoDetectModalRef.hide();

    this.firstStep = false;
    this.thirdStep = false;
    this.secondStep = false;
    this.errorStep = false;
  }

  goToSecondStep() {
    this.firstStep = false;
    this.secondStep = true
    this.runnerService.deviceConnetionRequest(this.communicationType, (data: DetectedDevice) => {
      console.log(`Device received:`, data);
      this.detectedDevice = data;
      const isDeviceValid = this.checkDetectedValidity(data);
      if (!isDeviceValid) {
        return this.goToErrorStep();
      }
      this.goToThirdStep();
    });
  }

  checkDetectedValidity(data: DetectedDevice) {
    // TO_DO: Finish validation serial number etc...
    return true;
  }

  goToThirdStep() {
    this.thirdStep = true;
    this.secondStep = false;
  }

  goToErrorStep() {
    this.errorStep = true;
    this.thirdStep = false;
  }

  onAddNewDevice() {
    this.addNewDevice.emit(this.detectedDevice);
    this.closeModal(undefined, true);
  }

  ngOnDestroy() {
    try {
      this.subscription.unsubscribe();
    } catch (e) {}
  }
}
