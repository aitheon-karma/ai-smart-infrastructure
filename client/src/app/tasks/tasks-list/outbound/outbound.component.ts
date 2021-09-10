import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { TaskService } from '../../shared/task.service';

@Component({
  selector: 'ai-outbound',
  templateUrl: './outbound.component.html',
  styleUrls: ['./outbound.component.scss']
})
export class OutboundComponent implements OnInit {
  loading = true;
  outboundList = [];
  allOutboundList: any = [];
  selectedTasks: any = [];
  currentPage: number;
  totalPages: number;
  options: any[];
  optionFlag: Boolean = false;
  pageNumberList: any = [];
  selectedPage: number;
  recordPerPage: number = 5;
  searchText = '';
  searchState = '';
  constructor(private taskService: TaskService, private toastr: ToastrService) {
    if (localStorage.getItem('currentPage') === null || localStorage.getItem('currentPage') === undefined) {
      this.currentPage = 1;
    } else {
      this.currentPage = Number(localStorage.getItem('currentPage'));
    }
  }
  ngOnInit() {
    this.options = [];
    this.optionFlag = false;
    this.pageNumberList = [];
    this.loading = true;
    // this.getOutboundTask(1);
    // this.taskService.getAllTrafficList(1).subscribe((res: any) => {
    //   this.totalPages = Math.ceil(res.totalCount / (this.recordPerPage ? this.recordPerPage : 5));
    //   for (let i = 1; i <= this.totalPages; i++) {
    //     this.options.push(i);
    //   }
    //   this.outboundList = res.data;

    //   this.allOutboundList = res.data;
    //   this.setPage(this.currentPage);
    // }, (err: any) => {
    //   this.toastr.error(err);
    //   this.loading = false;
    // });
  }
  // getOutboundTask(pageNo) {
  //   this.loading = true;
  //   this.taskService.getStationsTrafficList('OUTBOUND', pageNo, this.searchText, this.searchState, this.recordPerPage).subscribe((outboundResponse) => {
  //     let lastPages = Math.ceil(outboundResponse.totalCount / (this.recordPerPage ? this.recordPerPage : 5));

  //     // this.taskService.getStationsTrafficList('OUTBOUND', lastPages, this.searchText, this.searchState, this.recordPerPage).subscribe((outboundList) => {
  //     console.log('outbound task =>', outboundResponse);

  //     this.totalPages = Math.ceil(outboundResponse.totalCount / (this.recordPerPage ? this.recordPerPage : 5));
  //     this.totalPages = isNaN(this.totalPages) ? 0 : this.totalPages;
  //     for (let i = 1; i <= this.totalPages; i++) {
  //       this.options.push(i);
  //     }
  //     if (Number(this.totalPages) == 0) {
  //       localStorage.removeItem('recordPerPage');
  //       localStorage.setItem('recordPerPage', '5');
  //       this.recordPerPage = Number(localStorage.getItem('recordPerPage'))
  //     }
  //     this.outboundList = [];
  //     let dummyArray = outboundResponse.data;
  //     for (let i = 0; i <= dummyArray.length - 1; i++) {
  //       this.outboundList.push(dummyArray[i]);
  //     }
  //     this.optionFlag = true;
  //     this.paginationLogic(this.currentPage);
  //     this.loading = false;
  //   }, (err: any) => {
  //     this.toastr.error(err);
  //     this.loading = false;
  //     // });
  //   });
  // }
  // getAllOutboundTraffic(pageNo) {
  //   this.loading = true;
  //   this.outboundList = [];
  //   localStorage.setItem('currentPage', pageNo);
  //   this.recordPerPage = Number(localStorage.getItem('recordPerPage')) ? Number(localStorage.getItem('recordPerPage')) : 5;
  //   this.taskService.getAllTrafficList(pageNo, this.searchText, this.searchState, this.recordPerPage).subscribe((res: any) => {
  //     this.totalPages = Math.ceil(res.totalCount / (this.recordPerPage ? this.recordPerPage : 5));
  //     this.totalPages = isNaN(this.totalPages) ? 0 : this.totalPages;
  //     for (let i = 1; i <= this.totalPages; i++) {
  //       this.options.push(i);
  //     }
  //     if (Number(this.totalPages) == 0) {
  //       localStorage.removeItem('recordPerPage');
  //       localStorage.setItem('recordPerPage', '5');
  //       this.recordPerPage = Number(localStorage.getItem('recordPerPage'))
  //     }
  //     this.optionFlag = true;
  //     this.outboundList = res.data;
  //     console.log('getAll == > ', this.outboundList);
  //     console.log('getAll res data == > ', res);
  //     this.allOutboundList = res.data;
  //     this.paginationLogic(pageNo);
  //     this.loading = false;
  //   }, (err: any) => {
  //     this.toastr.error(err);
  //     this.loading = false;
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
    this.loading = true;
    // this.getOutboundTask(pageNo);
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
    // this.getOutboundTask(this.currentPage);
  }

  ngOnDestroy() {
    localStorage.removeItem('currentPage');
    localStorage.removeItem('recordPerPage');
  }

}
