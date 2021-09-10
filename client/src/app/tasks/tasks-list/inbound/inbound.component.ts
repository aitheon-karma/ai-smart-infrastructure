import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { TaskService } from '../../shared/task.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'ai-inbound',
  templateUrl: './inbound.component.html',
  styleUrls: ['./inbound.component.scss']
})
export class InboundComponent implements OnInit {

  inboundTrafficList = [];
  isLoading: boolean = true;
  outboundList: any = [];
  allOutboundList: any = [];
  selectedTasks: any = [];
  currentPage: number;
  totalPages: number;
  selectedInboundTask: any;
  options: any[];
  optionFlag: Boolean = false;
  pageNumberList: any = [];
  selectedPage: number;
  recordPerPage: number = 5;
  searchText = '';
  searchState = '';
  list = [];


  modalRef: BsModalRef;

  @ViewChild('detailModal') detailModal : TemplateRef<any>;

  constructor(private taskService: TaskService, private modalService: BsModalService) { }
  ngOnInit() {
    this.options = [];
    this.optionFlag = false;
    this.pageNumberList = [];
    if (localStorage.getItem('currentPage') === null || localStorage.getItem('currentPage') === undefined) {
      this.currentPage = 1;
    } else {
      this.currentPage = Number(localStorage.getItem('currentPage'));
    }
    // this.getAllInboundTask(1);
  }

  // getAllInboundTask(pageNo) {
  //   this.isLoading = true;

  //   localStorage.setItem('currentPage', pageNo);
  //   this.recordPerPage = Number(localStorage.getItem('recordPerPage')) ? Number(localStorage.getItem('recordPerPage')) : 5;
  //   this.taskService.getStationsTrafficList('INBOUND',pageNo, this.searchText, this.searchState, this.recordPerPage).subscribe((response) => {
  //     let lastPages = Math.ceil(response.totalCount / (this.recordPerPage ? this.recordPerPage : 5));
  //     console.log('toatl page =>',lastPages);

  //     // this.taskService.getStationsTrafficList('INBOUND',lastPages, this.searchText, this.searchState, this.recordPerPage).subscribe((response) => {
  //     // console.log('inbound response =>',response);
  //     this.outboundList = [];
  //     this.totalPages = Math.ceil(response.totalCount / (this.recordPerPage ? this.recordPerPage : 5));
  //     this.totalPages = isNaN(this.totalPages) ? 0 : this.totalPages;
  //     for (let i = 1; i <= this.totalPages; i++) {
  //       this.options.push(i);
  //     }
  //     if (Number(this.totalPages) == 0) {
  //       localStorage.removeItem('recordPerPage');
  //       localStorage.setItem('recordPerPage', '5');
  //       this.recordPerPage = Number(localStorage.getItem('recordPerPage'))
  //     }
  //     this.inboundTrafficList = [];
  //     this.inboundTrafficList = response.data;
  //     this.list = [];
  //     for (let i = 0 ; i < this.inboundTrafficList.length; i++) {
  //       this.taskService.getArticleDetails(this.inboundTrafficList[i].action.data.article.artCode).subscribe((artcileinfo) => {
  //         this.inboundTrafficList[i].action.data.article['name'] = artcileinfo.data.body.name ? artcileinfo.data.body.name : '';
  //         this.inboundTrafficList[i].action.data.article['images'] = artcileinfo.data.body.images ? artcileinfo.data.body.images : [];
  //       });
  //       this.inboundTrafficList[i]['progress'] = Math.floor(Math.random() * 4);
  //       this.list.push(this.inboundTrafficList[i]);
  //     }
  //     this.optionFlag = true;
  //     this.paginationLogic(pageNo);
  //     this.isLoading = false;
  //   // });
  //   });
  // }

  search(searchText: string, searchState: string) {
    this.searchText = searchText;
    if (searchState === "All") {
      this.searchState = '';
    }
    if (searchState !== "All") {
      this.searchState = searchState;
    }
    if (searchText === '' || searchText.length < 3) {
      this.currentPage = 1;
      this.setPage(this.currentPage);
    } else {
      this.currentPage = 1;
      this.setPage(1);

    }
  }

  setPage(pageNo) {
    pageNo = Number(pageNo);
    this.optionFlag = false;
    this.currentPage = pageNo;
    this.selectedPage = pageNo;
    this.paginationLogic(pageNo);
    // this.getAllInboundTask(pageNo);
    this.optionFlag = true;
  }

  paginationLogic(pageNo) {
    // pagination logic start
    this.pageNumberList = [];
    for (let i = 1; i <= this.totalPages; i++) {
      if (i >= (pageNo - 2) && i <= (pageNo + 1)) {
        this.pageNumberList.push(i);
      } else if (i != this.totalPages && i >= (pageNo + 1)) {
        this.pageNumberList.push(-1);
      } else if (i == this.totalPages) {
        this.pageNumberList.push(i);
      }
    }
    this.pageNumberList = this.pageNumberList.filter(function (elem, index, self) {
      return index === self.indexOf(elem);
    });
    // pagination logic end
  }

  //setting the record count on dropdown
  setRecordCount(recordCount) {
    localStorage.setItem('recordPerPage', recordCount.toString());
    localStorage.removeItem('currentPage');
    localStorage.setItem('currentPage', '1');
    this.currentPage = Number(localStorage.getItem('currentPage'));
    this.recordPerPage = Number(localStorage.getItem('recordPerPage'));
    // this.getAllInboundTask(this.currentPage);
  }

  openDetailModal(inboundTask,template: TemplateRef<any>){
    console.log("inbound task =>",inboundTask);

    this.selectedInboundTask = inboundTask;
    this.selectedInboundTask['subSystemTask'] = [];
    for(let i = 0;i <this.selectedInboundTask.dependencies.length; i++){
     // console.log(this.selectedInboundTask['dependencies'][i]);
      //
      if(this.selectedInboundTask['dependencies'][i].task.action.name != 'TRANSFER_TO_DECANTING_ENTRY'){
       let dummyData ={
          status: this.selectedInboundTask['dependencies'][i].task.action.data.status,
          task:this.selectedInboundTask['dependencies'][i].task.action.name,
          binId: this.selectedInboundTask['dependencies'][i].task.action.data.binId ? this.selectedInboundTask['dependencies'][i].task.action.data.binId : '',
          location: this.selectedInboundTask['dependencies'][i].task.action.data.location? this.selectedInboundTask['dependencies'][i].task.action.data.location : '',
          qty: this.selectedInboundTask['dependencies'][i].task.action.data.quantity
        }
        if(this.selectedInboundTask.subSystemTask.length == 0){
          this.selectedInboundTask.subSystemTask.push(dummyData);
        }
        else{
          let flag = false;
          for(let j = 0; j<this.selectedInboundTask.subSystemTask.length;j++){
            if(dummyData.binId === this.selectedInboundTask.subSystemTask[j].binId){
              flag = true;
              this.selectedInboundTask.subSystemTask[j].status = dummyData.status,
              this.selectedInboundTask.subSystemTask[j].task = dummyData.task,
              this.selectedInboundTask.subSystemTask[j].location = dummyData.location
              //this.selectedInboundTask.subSystemTask[j].qty = dummyData.qty
            }
          }
          if(flag == false){
            this.selectedInboundTask.subSystemTask.push(dummyData);
          }
        }
      }
     // console.log('final data ==>', this.selectedInboundTask.subSystemTask);
    }
    //this.selectedInboundTask['dependencies']
    this.modalRef = this.modalService.show(template,{ class:'inboundModal'});
  }

  ngOnDestroy() {
    localStorage.removeItem('currentPage');
    localStorage.removeItem('recordPerPage');
  }
}
