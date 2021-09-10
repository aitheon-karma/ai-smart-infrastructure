import {
  Component,
  OnChanges,
  OnInit,
  Input,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { ItemsService } from '../shared/items.service'
import { Item } from '../shared/item.model';
import { AuthService } from '@aitheon/core-client';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ExcelService } from '../shared/excel.service';

@Component({
  selector: 'ai-items-card',
  templateUrl: './items-card.component.html',
  styleUrls: ['./items-card.component.scss']
})
export class ItemsCardComponent implements OnChanges, OnInit {
  @Input() Item;
  @Input() listChangeStat: any;
  @ViewChild('settingModal') settingModal: TemplateRef<any>;

  modalRef: BsModalRef;
  configModal = {
    keyboard: false,
    ignoreBackdropClick: true,
    class: "modal-lg"
  }
  index: number = 0;

  settingForm: FormGroup;
  exampleModalRef: BsModalRef;
  currentOrganization: any;
  initialized = false;
  item: any;
  itemDetails: Item;
  itemListView = false;
  inventoryReport = false;

  modalConfig = {
    animated: true,
    keyboard: false,
    ignoreBackdropClick: true,
    class: 'modal-lg modal-dialog-centered '
  };
  itemConfig: any;
  infrastructureInfo: any = {};
  constructor(private itemsService: ItemsService,
    private modalService: BsModalService,
    private fb: FormBuilder,
    private toaster: ToastrService,
    private authService: AuthService,
    private excelService: ExcelService) { }
  ngOnChanges() {
    this.item = this.Item;
    this.initialized = true;
  }
  ngOnInit() {
    if (JSON.parse(localStorage.getItem('infrastructure'))) {
      this.infrastructureInfo = JSON.parse(localStorage.getItem('infrastructure'));
    }
    if (this.initialized) {
      // this.itemsService.get(this.item._id).subscribe((items) => {
      //   this.item = items;
      // })
    }

    this.buildSettingForm();
  }
  getItemConfig() {
    this.itemsService.getConfigById(this.Item['_id']).subscribe((itemConfig): any => {
      this.itemConfig = itemConfig;
      if (this.itemConfig && this.itemConfig['config']) {
        this.itemConfig['config'].min ? this.settingForm.controls['min'].setValue(this.itemConfig['config'].min) : null;
        this.itemConfig['config'].max ? this.settingForm.controls['max'].setValue(this.itemConfig['config'].max) : null;
        this.itemConfig['config'].TIE ? this.settingForm.controls['tie'].setValue(this.itemConfig['config'].TIE) : null;
        this.itemConfig['config'].HIGH ? this.settingForm.controls['high'].setValue(this.itemConfig['config'].HIGH) : null;
      }
    });
  }
  buildSettingForm() {
    this.settingForm = this.fb.group({
      tie: [0, [Validators.pattern('[0-9]*')]],
      high: [0, [Validators.pattern('[0-9]*')]],
      min: [0, [Validators.pattern('[0-9]*')]],
      max: [0, [Validators.pattern('[0-9]*')]],
    });
  }
  getAvailable(item: Item) {
    let sum = 0;
    if (item.inventory) {
      const length = item.inventory.length;
      for (let i = 0; i < length; i++) {
        sum = sum + item.inventory[i].available;
      }
    }
    return sum;
  }
  changeView($event) {
  }
  OpenSettingModal() {
    this.getItemConfig();
    this.exampleModalRef = this.modalService.show(this.settingModal);
  }
  onCloseDialog() {
    this.exampleModalRef.hide();
  }
  saveSettings() {
    if (this.settingForm.invalid) {
      return;
    } else {
      // stuff to do
      let settingPayload = {
        infrastructure: this.infrastructureInfo.Id,
        config: {
          min: this.settingForm.value['min'],
          max: this.settingForm.value['max'],
          TIE: this.settingForm.value['tie'],
          HIGH: this.settingForm.value['high']
        },
        itemId: this.item._id
      }

      this.itemsService.saveItemConfig(settingPayload).subscribe((response) => {
        this.toaster.success('Configuration saved');
        this.onCloseDialog();

      });
    }
  }

  openModal(template: TemplateRef<any>) {
    this.index = 0;
    this.modalRef = this.modalService.show(template, this.configModal);
  }

  getInventoryLogs(itemId) {
    this.inventoryReport = true;
    // console.log('Item Id', itemId);
    let logsData: any = [];
    /*** Get data from beta interface for Inventory logs ***/
    this.itemsService.getInventoryLogs('years', itemId).subscribe((response: any) => {
      const res = response;
      console.log('Response', res);
      res.forEach((element, index) => {
        logsData.push({
          SrNo: index + 1,
          Item: element.articleId,
          From: element.fromType,
          To: element.toType,
          Quantity: element.quantity,
          Date: element.createdAt
        });
      })
      setTimeout(() => {
        if (logsData.length > 0) {
          this.excelService.exportAsExcelFile(logsData, 'sample');
          this.inventoryReport = false;
          this.toaster.success('Report downloaded');
        } else {
          this.inventoryReport = false;
          this.toaster.error('!No logs found');
        }
      });
    });

  }

}
